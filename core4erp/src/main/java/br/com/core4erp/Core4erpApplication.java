package br.com.core4erp;

import br.com.core4erp.config.env.EnvConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Core4erpApplication {

	public static void main(String[] args) {
		new EnvConfig();
		SpringApplication.run(Core4erpApplication.class, args);
	}

}
