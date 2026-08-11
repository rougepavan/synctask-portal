package com.taskportal.backend.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
@Profile("prod")
public class DatabaseConfig {

    @Value("${DATABASE_URL:}")
    private String databaseUrl;

    @Value("${SPRING_DATASOURCE_URL:}")
    private String springDatasourceUrl;

    @Value("${SPRING_DATASOURCE_USERNAME:}")
    private String springDatasourceUsername;

    @Value("${SPRING_DATASOURCE_PASSWORD:}")
    private String springDatasourcePassword;

    @Bean
    public DataSource dataSource() {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setDriverClassName("org.postgresql.Driver");

        String rawUrl = (databaseUrl != null && !databaseUrl.trim().isEmpty()) ? databaseUrl.trim() : springDatasourceUrl;

        if (rawUrl != null && !rawUrl.isEmpty()) {
            String cleanUrl = rawUrl.startsWith("jdbc:") ? rawUrl.substring(5) : rawUrl;
            if (cleanUrl.startsWith("postgresql://") || cleanUrl.startsWith("postgres://")) {
                try {
                    URI uri = new URI(cleanUrl);
                    String host = uri.getHost();
                    int port = uri.getPort() == -1 ? 5432 : uri.getPort();
                    String path = uri.getPath();

                    String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path;
                    dataSource.setJdbcUrl(jdbcUrl);

                    if (uri.getUserInfo() != null) {
                        String[] userInfo = uri.getUserInfo().split(":");
                        dataSource.setUsername(userInfo[0]);
                        if (userInfo.length > 1) {
                            dataSource.setPassword(userInfo[1]);
                        }
                    }
                    System.out.println("[DatabaseConfig] Successfully parsed Render DATABASE_URL. JDBC URL: " + jdbcUrl);
                    return dataSource;
                } catch (Exception e) {
                    System.err.println("[DatabaseConfig] Failed to parse URI: " + e.getMessage() + ", falling back.");
                }
            }
        }

        // Fallback for explicitly supplied JDBC parameters
        if (springDatasourceUrl != null && !springDatasourceUrl.isEmpty()) {
            dataSource.setJdbcUrl(springDatasourceUrl.startsWith("jdbc:") ? springDatasourceUrl : "jdbc:" + springDatasourceUrl);
        } else if (rawUrl != null && !rawUrl.isEmpty()) {
            dataSource.setJdbcUrl(rawUrl.startsWith("jdbc:") ? rawUrl : "jdbc:" + rawUrl);
        }

        if (springDatasourceUsername != null && !springDatasourceUsername.isEmpty()) {
            dataSource.setUsername(springDatasourceUsername);
        }
        if (springDatasourcePassword != null && !springDatasourcePassword.isEmpty()) {
            dataSource.setPassword(springDatasourcePassword);
        }

        return dataSource;
    }
}
