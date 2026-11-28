package have.bootstrap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import have.audit.AuditPayload;
import have.audit.IAuditLog;
import have.common.code.AuditAction;
import have.work.IWorkVersion;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** 공용 대역은 진짜 구현이 없을 때만 들어가고, 진짜 구현이 생기면 자동으로 빠지는지 확인한다. 합칠 때 빈이 둘이 되지 않는다는 근거다. */
class PlaceholderConfigurationTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(PlaceholderConfiguration.class));

    /** D가 만든 진짜 구현이라고 치는 빈 */
    @Configuration
    static class RealAuditLogConfig {
        @Bean
        IAuditLog realAuditLog() {
            return (workId, actorId, action, payload) -> {
            };
        }
    }

    @Test
    void 진짜_구현이_없으면_대역이_들어가고_부르면_알려_준다() {
        runner.run(context -> {
            IAuditLog auditLog = context.getBean(IAuditLog.class);
            assertThat(auditLog.toString()).contains("대역(담당 D)");
            UnsupportedOperationException e = assertThrows(UnsupportedOperationException.class,
                    () -> auditLog.record(1L, 1L, AuditAction.CREATE_WORK, AuditPayload.none()));
            assertThat(e.getMessage()).contains("담당 D");
            assertThat(context.getBean(IWorkVersion.class).toString()).contains("대역(담당 A)");
        });
    }

    @Test
    void 진짜_구현이_있으면_대역은_빠지고_빈은_하나다() {
        runner.withUserConfiguration(RealAuditLogConfig.class).run(context -> {
            assertThat(context).hasSingleBean(IAuditLog.class);
            assertThat(context.getBean(IAuditLog.class).toString()).doesNotContain("대역");
            context.getBean(IAuditLog.class).record(1L, 1L, AuditAction.CREATE_WORK, AuditPayload.none());
        });
    }
}
