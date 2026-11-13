package com.app.zipcodec;

import com.app.zipcodec.config.ArchiveProperties;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.info.BuildProperties;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
@EnableConfigurationProperties(ArchiveProperties.class)
public class ZipCodecApplication {
    public static void main(String[] args) {
        SpringApplication.run(ZipCodecApplication.class, args);
    }
    /**
     * Describes the published contract so the generated OpenAPI document and the
     * Swagger UI carry the safety limits a caller has to design against.
     */
    @Bean
    public OpenAPI zipCodecOpenApi(ObjectProvider<BuildProperties> buildProperties) {
        BuildProperties build = buildProperties.getIfAvailable();
        return new OpenAPI().info(new Info()
                .title("ZIP Codec Service")
                .version(build == null ? "1.0.0-SNAPSHOT" : build.getVersion())
                .description("""
                        Converts ZIP archives to Base64 text and back.
                        Three modes are available: `encode` returns the whole archive as a single \
                        Base64 string, `explode` returns a recursive tree with one Base64 payload \
                        per file, and `decode`/`rebuild` produce a ZIP stream again.""")
                .license(new License().name("Apache-2.0").url("https://www.apache.org/licenses/LICENSE-2.0")));
    }
}
