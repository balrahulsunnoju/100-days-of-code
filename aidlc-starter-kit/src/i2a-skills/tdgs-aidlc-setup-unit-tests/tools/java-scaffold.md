# Setup Unit Tests — Java Scaffold

Step 2 (Maven) and Step 2b (Gradle) for Java / Spring Boot repositories.

---

## Step 2. Scaffold/Enhance Per Repo — Java / Spring Boot (Maven)

> **Supported scope:** this scaffold targets **`spring-boot-starter-parent` 3.x + JDK 17/21**. Other stacks need pre-checks the generator must surface to the user instead of silently applying this template:
> - **SB 2.x** → also pin `maven-surefire-plugin` 3.x (parent manages 2.22 which silently skips JUnit 5).
> - **SB 2.7 + JDK 17+** → override Mockito to 5.x (parent's Mockito 4 fails on records/sealed classes).
> - **Non-Spring-Boot Maven** → pin explicit versions for `maven-surefire-plugin` (≥3.2.5), `mockito-core` + `mockito-junit-jupiter` (≥5.x), `junit-jupiter` (≥5.10).
> - **JDK 24+** → use JaCoCo ≥0.8.13 (see version table below).
> If the detected stack is outside the supported scope, STOP and ask the user before scaffolding.

**Check existing test infrastructure:**
- `src/test/java/` directory structure
- Existing test files (`*Test.java`, `*Tests.java`, `*IT.java`)
- Testing dependencies in `pom.xml` (`spring-boot-starter-test`, `mockito`, `junit-jupiter`)
- JaCoCo plugin configuration

**Add missing dependencies to `pom.xml`** (DO NOT overwrite existing):
```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-test</artifactId>
  <scope>test</scope>
</dependency>
```

> **`spring-boot-starter-test` is sufficient — do NOT add `mockito-core` / `mockito-junit-jupiter` / `junit-jupiter` explicitly.** They are pulled transitively (along with AssertJ, Hamcrest, Spring Test, JsonPath, JSONassert) and the versions are aligned by `spring-boot-starter-parent`. Adding them explicitly without a version is harmless; adding them WITH a version risks a Mockito↔Spring version mismatch. Only add a standalone Mockito dep if the project does NOT use `spring-boot-starter-parent`.

**Add conditional dependencies** (only when the repo uses the corresponding feature — detect from source imports):
```xml
<!-- ADD if any source file imports javax.persistence.* / jakarta.persistence.* OR @DataJpaTest exists in test/ -->
<dependency>
  <groupId>com.h2database</groupId>
  <artifactId>h2</artifactId>
  <scope>test</scope>
</dependency>

<!-- ADD if any source file imports org.springframework.security.* OR @EnableWebSecurity / @PreAuthorize exists -->
<dependency>
  <groupId>org.springframework.security</groupId>
  <artifactId>spring-security-test</artifactId>
  <scope>test</scope>
</dependency>
```

> **Detection rules:** Grep `src/main/java/` for `import javax.persistence` / `import jakarta.persistence` / `@Entity` / `@Repository` → add H2. Grep for `import org.springframework.security` / `@EnableWebSecurity` / `@PreAuthorize` / `@Secured` → add spring-security-test. Do NOT add either blindly — they are only useful when the service uses JPA / Spring Security respectively.

**Add/update JaCoCo plugin with coverage reporting and threshold monitoring:**

> **JDK version → JaCoCo version (pick the lowest version that covers your JDK; higher is always backward-compatible):**
> - JDK 8–21 → `0.8.12` (default in template below)
> - JDK 22–23 → `0.8.12` (supported)
> - JDK 24+ → `0.8.13` or newer
> Detect from the repo's `<java.version>` / `maven.compiler.release` / `spring-boot-starter-parent` version and pin accordingly. JaCoCo silently skips instrumenting class files with an unrecognized bytecode major version, producing 0% coverage with no error.

> **Mockito synthetic-class excludes are MANDATORY for Spring Boot 3.x / Mockito 5.** Spring Boot 3.x ships Mockito 5, whose default **inline mock maker** generates ByteBuddy synthetic classes (`*MockitoMock*`, `*$auxiliary$*`). JaCoCo instruments these, which (a) inflates the bundle denominator with uncoverable synthetic branches and (b) can flip a true ≥80% project to FAIL the `BUNDLE` `check` rule. The `<configuration><excludes>` block below applies plugin-wide to both the `report` and `check` goals.
>
> **Optional extras (do NOT add by default):** `**/*$$EnhancerByMockito*` is only needed if the project switches Mockito back to the legacy subclass mock maker. `**/*Application.class` lets you skip writing a `contextLoads()` smoke test — only add it if the team agrees, otherwise keep the test. Same for generated/DTO packages.

```xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.12</version>
  <configuration>
    <excludes>
      <!-- Mockito 5 inline-mock-maker synthetics (Spring Boot 3.x default) -->
      <exclude>**/*MockitoMock*</exclude>
      <exclude>**/*$auxiliary$*</exclude>
    </excludes>
  </configuration>
  <executions>
    <execution>
      <goals><goal>prepare-agent</goal></goals>
    </execution>
    <execution>
      <id>report</id>
      <phase>test</phase>
      <goals><goal>report</goal></goals>
    </execution>
    <execution>
      <id>check</id>
      <phase>verify</phase>
      <goals><goal>check</goal></goals>
      <configuration>
        <haltOnFailure>false</haltOnFailure>
        <!-- haltOnFailure=false: coverage misses are logged as warnings but do NOT fail the build.
             Build failure is driven by test failures (surefire), not coverage thresholds.
             This is intentional — DevOps owns deployment-gate decisions. -->
        <rules>
          <rule>
            <element>BUNDLE</element>
            <limits>
              <limit>
                <counter>LINE</counter>
                <value>COVEREDRATIO</value>
                <minimum>{coverage_target_decimal}</minimum>
                <!-- {coverage_target_decimal} = the integer percent value rendered as a decimal in [0.00, 1.00] with exactly two fractional digits.
                     Examples: coverage_target=80 → 0.80 ; coverage_target=75 → 0.75 ; coverage_target=100 → 1.00 ; coverage_target=5 → 0.05.
                     Compute as: format(coverage_target / 100, '0.00'). Do NOT emit `{coverage_target/100}` literally — JaCoCo's XML parser does not evaluate expressions; the literal string is silently ignored and enforcement is disabled. -->
              </limit>
              <limit>
                <counter>BRANCH</counter>
                <value>COVEREDRATIO</value>
                <minimum>{coverage_target_decimal}</minimum>
                <!-- Same decimal computation as LINE. BRANCH coverage prevents "100% line coverage, 0% if/else coverage" -->
              </limit>
            </limits>
          </rule>
        </rules>
      </configuration>
    </execution>
  </executions>
</plugin>
```

> ⚠️ **JaCoCo `argLine` collision:** If `maven-surefire-plugin` already declares a custom `<argLine>` (e.g., `<argLine>-Xmx2g</argLine>`), JaCoCo's `prepare-agent` goal cannot inject its agent. Fix: change the existing `<argLine>` to `<argLine>@{argLine} -Xmx2g</argLine>` so JaCoCo's property is prepended. Without this, coverage silently reports 0%.

**Add Surefire Report plugin for HTML test results view:**

> ⚠️ **CRITICAL — JaCoCo only produces coverage HTML, NOT test results HTML.** Without `maven-surefire-report-plugin`, the only test output is unreadable XML in `target/surefire-reports/`. ALWAYS add this plugin. **`surefire-report:report-only` is NON-BLOCKING** — it requires `doxia-site-renderer` from Maven Central/Artifactory; in restricted networks (no VPN reach) it errors with "Could not resolve dependencies". The custom `generate-report.js` parses `target/surefire-reports/*.xml` directly. `run-tests` runs surefire-report in a subshell with error suppression.

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-surefire-report-plugin</artifactId>
  <version>3.5.3</version>
  <executions>
    <execution>
      <id>test-report</id>
      <phase>test</phase>
      <goals><goal>report-only</goal></goals>
    </execution>
  </executions>
</plugin>
```

**Java HTML report locations after `mvn test`:**
| Report | Path | Content |
|--------|------|---------|
| Coverage (JaCoCo) | `target/site/jacoco/index.html` | Line/branch/method coverage |
| Test Results (Surefire) | `target/site/surefire-report.html` | Pass/fail/skip per test class and method |

> 🔔 **Test category filtering (Surefire 3.x native).** Tests authored per `/tdgs-aidlc-generate-unit-tests` (G17) carry `@Tag("smoke")` on the first happy-path `@Test` per class and `@Tag("regression")` on all others; `@Tag("integration")` is an OPTIONAL orthogonal axis for `@DataJpaTest` / `@SpringBootTest` / Testcontainers and composes with smoke/regression. Run a slice via `mvn test -Dgroups=smoke` (or `regression` / `integration`). NO `<groups>` block in `pom.xml` is required — Surefire 3.x honors `-Dgroups=…` natively; default `mvn test` runs all. Pair `@Tag` with `@Nested` + `@DisplayName` for human-readable Surefire output.

**Create base test utilities if not existing:**
- `src/test/java/{base-package}/TestDataBuilder.java` — Builder pattern for test entities
- `src/test/java/{base-package}/MockConfig.java` — Common mock configurations (`@MockBean` setup)

**Create `scripts/generate-report.js` stub (MANDATORY):**

The `run-tests` and `generate-unit-tests` prompts both chain `node scripts/generate-report.js` after `mvn test` so the custom HTML dashboard / Markdown summary stay in sync with native test output. If the script doesn't exist, the chain fails with `Cannot find module`. Create a **working stub** at `{repo}/scripts/generate-report.js` so the chain is safe immediately after setup. The stub should:
1. Look for `target/surefire-reports/*.xml` and `target/site/jacoco/jacoco.csv`
2. If found → write a minimal `test-results/test-summary.html` with a "Stub report — run /tdgs-aidlc-generate-unit-tests for the full dashboard" message and basic counts parsed from surefire XML
3. If not found → print a warning to console and exit 0 (never fail the chained command)
4. Always create the `test-results/` directory if missing

> The **full standardized 7-section dashboard** is generated by `/tdgs-aidlc-generate-unit-tests`. The stub only exists so chained `; node scripts/generate-report.js` commands don't fail between setup and full generation.

---

## Step 2b. Scaffold/Enhance Per Repo — Java / Spring Boot (Gradle)

When the repo's build file is `build.gradle` / `build.gradle.kts` (NOT `pom.xml`), apply the Gradle-equivalent of Step 2 — the detection table at Step 1 lists Gradle-Spring-Boot as a first-class stack, but Step 2 above only covers Maven. Without this branch, Gradle repos silently fall through with no JaCoCo enforcement and no coverage reports.

**Add missing dependencies (`build.gradle`):**
```groovy
dependencies {
  testImplementation 'org.springframework.boot:spring-boot-starter-test'
}
test { useJUnitPlatform() }
```

> Same rule as Maven: `spring-boot-starter-test` transitively brings Mockito 5 (core + junit-jupiter), JUnit 5, AssertJ, Spring Test — do NOT add them explicitly.

**Add JaCoCo plugin with coverage reporting and threshold monitoring:**
```groovy
plugins { id 'jacoco' }

jacoco { toolVersion = '0.8.12' }

jacocoTestReport {
  dependsOn test
  reports {
    xml.required = true
    html.required = true
    csv.required = true   // generate-report.js consumes build/reports/jacoco/test/jacocoTestReport.csv
  }
}

jacocoTestCoverageVerification {
  violationRules {
    rule {
      limit {
        counter = 'LINE'
        value   = 'COVEREDRATIO'
        minimum = {coverage_target_decimal}   // same compute rule as Maven — e.g., 0.80 for target=80
      }
      limit {
        counter = 'BRANCH'
        value   = 'COVEREDRATIO'
        minimum = {coverage_target_decimal}   // BRANCH prevents "100% line coverage, 0% if/else coverage"
      }
    }
  }
}

check.dependsOn jacocoTestCoverageVerification
test.finalizedBy jacocoTestReport
```

**Gradle HTML report locations after `./gradlew test jacocoTestReport`:**
| Report | Path | Content |
|--------|------|---------|
| Coverage (JaCoCo) | `build/reports/jacoco/test/html/index.html` | Line/branch/method coverage |
| Test Results (Gradle) | `build/reports/tests/test/index.html` | Pass/fail/skip per test class and method (Gradle generates this natively — no Surefire report plugin needed) |

**Gradle DOES NOT need maven-surefire-report-plugin** — the Gradle test task produces an HTML test report natively at `build/reports/tests/test/index.html`. Do NOT scaffold a Surefire equivalent.

The `scripts/generate-report.js` stub created in Step 2 above MUST detect the build system and consume the right inputs:
  - Maven: `target/surefire-reports/*.xml` + `target/site/jacoco/jacoco.csv`
  - Gradle: `build/test-results/test/*.xml` + `build/reports/jacoco/test/jacocoTestReport.csv`
Detection rule: if `pom.xml` exists → Maven; else if `build.gradle` or `build.gradle.kts` exists → Gradle; else NOT-a-Java repo (skip Step 2/2b entirely).
