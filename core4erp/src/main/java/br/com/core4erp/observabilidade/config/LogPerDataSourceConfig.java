package br.com.core4erp.observabilidade.config;

import com.zaxxer.hikari.HikariDataSource;
import jakarta.persistence.EntityManagerFactory;
import org.flywaydb.core.Flyway;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

@Configuration
@EnableJpaRepositories(
        basePackages = "br.com.core4erp.observabilidade.repository",
        entityManagerFactoryRef = "logPerEntityManagerFactory",
        transactionManagerRef = "logPerTransactionManager"
)
public class LogPerDataSourceConfig {

    @Value("${spring.datasource.logper.url}")
    private String url;

    @Value("${spring.datasource.logper.username}")
    private String username;

    @Value("${spring.datasource.logper.password}")
    private String password;

    @Bean("logPerDataSource")
    DataSource logPerDataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(url);
        ds.setUsername(username);
        ds.setPassword(password);
        ds.setDriverClassName("org.postgresql.Driver");
        ds.setMaximumPoolSize(3);
        ds.setMinimumIdle(1);
        ds.setConnectionTimeout(60000);
        ds.setPoolName("logper-pool");
        return ds;
    }

    @Bean("logPerFlyway")
    @DependsOn("logPerDataSource")
    Flyway logPerFlyway(@Qualifier("logPerDataSource") DataSource dataSource) {
        removeErroneousBaseline(dataSource);
        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration-log")
                .table("flyway_log_schema_history")
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .outOfOrder(true)
                .load();
        flyway.migrate();
        return flyway;
    }

    /**
     * Workaround para ambientes que receberam um BASELINE errado (version='1') na primeira execução
     * antes de V1__create_tb_log_performance.sql existir. Sem essa remoção, o Flyway considera V1
     * como já aplicado e pula a criação das tabelas, causando falha na inicialização do JPA.
     *
     * Pode ser removido após confirmar que todos os bancos de log foram migrados corretamente
     * (i.e., tb_log_performance existe em todos os ambientes).
     */
    private void removeErroneousBaseline(DataSource dataSource) {
        String checkTable = "SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_log_performance'";
        String deleteBaseline = "DELETE FROM flyway_log_schema_history WHERE version = '1' AND type = 'BASELINE'";
        try (Connection conn = dataSource.getConnection()) {
            boolean tableExists;
            try (PreparedStatement ps = conn.prepareStatement(checkTable);
                 ResultSet rs = ps.executeQuery()) {
                tableExists = rs.next();
            }
            if (!tableExists) {
                try (PreparedStatement ps = conn.prepareStatement(deleteBaseline)) {
                    ps.executeUpdate();
                }
            }
        } catch (Exception ignored) {}
    }

    @Bean("logPerEntityManagerFactory")
    @DependsOn("logPerFlyway")
    LocalContainerEntityManagerFactoryBean logPerEntityManagerFactory(
            @Qualifier("logPerDataSource") DataSource dataSource) {

        HibernateJpaVendorAdapter adapter = new HibernateJpaVendorAdapter();
        adapter.setDatabasePlatform("org.hibernate.dialect.PostgreSQLDialect");

        LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(dataSource);
        factory.setJpaVendorAdapter(adapter);
        factory.setPackagesToScan("br.com.core4erp.observabilidade.entity");

        Properties props = new Properties();
        props.setProperty("hibernate.hbm2ddl.auto", "validate");
        props.setProperty("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
        factory.setJpaProperties(props);
        return factory;
    }

    @Bean("logPerTransactionManager")
    PlatformTransactionManager logPerTransactionManager(
            @Qualifier("logPerEntityManagerFactory") EntityManagerFactory emf) {
        return new JpaTransactionManager(emf);
    }

    @Bean("logExecutor")
    Executor logExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("log-async-");
        executor.setTaskDecorator(runnable -> {
            Map<String, String> mdcCopy = MDC.getCopyOfContextMap();
            return () -> {
                try {
                    if (mdcCopy != null) MDC.setContextMap(mdcCopy);
                    runnable.run();
                } finally {
                    MDC.clear();
                }
            };
        });
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.DiscardPolicy());
        executor.initialize();
        return executor;
    }
}
