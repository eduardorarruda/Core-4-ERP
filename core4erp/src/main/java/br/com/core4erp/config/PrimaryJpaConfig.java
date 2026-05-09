package br.com.core4erp.config;

import com.zaxxer.hikari.HikariDataSource;
import jakarta.persistence.EntityManagerFactory;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.Primary;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import javax.sql.DataSource;
import java.util.Properties;

@Configuration
@EnableTransactionManagement
@EnableJpaRepositories(
        basePackages = {
                "br.com.core4erp.assinatura",
                "br.com.core4erp.cartaoCredito",
                "br.com.core4erp.categoria",
                "br.com.core4erp.conciliacao",
                "br.com.core4erp.conta",
                "br.com.core4erp.contaCorrente",
                "br.com.core4erp.investimento",
                "br.com.core4erp.notificacao",
                "br.com.core4erp.parceiro",
                "br.com.core4erp.usuario"
        },
        entityManagerFactoryRef = "entityManagerFactory",
        transactionManagerRef = "transactionManager"
)
public class PrimaryJpaConfig {

    @Value("${spring.datasource.url}")
    private String url;

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    @Primary
    @Bean("dataSource")
    DataSource dataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(url);
        ds.setUsername(username);
        ds.setPassword(password);
        ds.setDriverClassName("org.postgresql.Driver");
        ds.setMaximumPoolSize(3);
        ds.setMinimumIdle(1);
        ds.setConnectionTimeout(60000);
        ds.setInitializationFailTimeout(120000);
        ds.setPoolName("primary-pool");
        return ds;
    }

    @Primary
    @Bean("primaryFlyway")
    @DependsOn("dataSource")
    Flyway primaryFlyway(@Qualifier("dataSource") DataSource dataSource) {
        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .baselineVersion("1")
                .outOfOrder(true)
                .ignoreMigrationPatterns("*:missing")
                .load();
        flyway.migrate();
        return flyway;
    }

    @Primary
    @Bean("entityManagerFactory")
    @DependsOn("primaryFlyway")
    LocalContainerEntityManagerFactoryBean entityManagerFactory(
            @Qualifier("dataSource") DataSource dataSource) {

        HibernateJpaVendorAdapter adapter = new HibernateJpaVendorAdapter();
        adapter.setShowSql(false);
        adapter.setDatabasePlatform("org.hibernate.dialect.PostgreSQLDialect");

        LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(dataSource);
        factory.setJpaVendorAdapter(adapter);
        factory.setPackagesToScan(
                "br.com.core4erp.assinatura",
                "br.com.core4erp.cartaoCredito",
                "br.com.core4erp.categoria",
                "br.com.core4erp.conciliacao",
                "br.com.core4erp.conta",
                "br.com.core4erp.contaCorrente",
                "br.com.core4erp.investimento",
                "br.com.core4erp.notificacao",
                "br.com.core4erp.parceiro",
                "br.com.core4erp.usuario"
        );

        Properties props = new Properties();
        props.setProperty("hibernate.hbm2ddl.auto", "validate");
        props.setProperty("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
        props.setProperty("hibernate.show_sql", "false");
        props.setProperty("hibernate.format_sql", "false");
        props.setProperty("hibernate.physical_naming_strategy",
                "org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy");
        props.setProperty("hibernate.implicit_naming_strategy",
                "org.hibernate.boot.model.naming.ImplicitNamingStrategyJpaCompliantImpl");
        factory.setJpaProperties(props);
        return factory;
    }

    @Primary
    @Bean("transactionManager")
    PlatformTransactionManager transactionManager(
            @Qualifier("entityManagerFactory") EntityManagerFactory emf) {
        return new JpaTransactionManager(emf);
    }
}
