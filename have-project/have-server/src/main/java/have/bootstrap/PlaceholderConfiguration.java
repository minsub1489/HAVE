package have.bootstrap;

import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

import have.approval.IApprovalStatus;
import have.audit.IAuditLog;
import have.audit.INotification;
import have.auth.IAuthorization;
import have.auth.TokenService;
import have.certificate.ICertificateData;
import have.persistence.FileStore;
import have.persistence.IPersistence;
import have.review.IReviewResult;
import have.work.IWorkVersion;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;

/**
 * 공용 대역(placeholder). 서브시스템 사이 인터페이스의 진짜 구현이 아직 없을 때만 들어가는 빈이다. 11/28에 미리 만들어 둔 것이다.
 * 1단계(각자 작업)에서 자기 브랜치에 다른 사람의 구현이 없어도 서버와 `gradlew test`가 뜨게 하려고 둔다.
 * 진짜 구현(@Component · @Service)이 생기면 그 빈이 쓰이고 이 대역은 자동으로 빠진다(@ConditionalOnMissingBean).
 * 그래서 합칠 때 대역을 지우지 않아도 빈이 둘이 되는 일이 없다. 2단계가 끝나면 이 파일과 imports 등록을 지운다(D17).
 *
 * <p>대역은 부르면 UnsupportedOperationException을 던진다. 다른 사람의 인터페이스가 필요한 테스트는
 * 이 대역에 기대지 말고 Mockito(mock(…), @MockitoBean)로 원하는 값을 돌려주게 한다(가이드라인 8.2).
 * 다른 사람의 인터페이스를 main 코드에서 직접 구현하지 않는다.
 */
@AutoConfiguration
public class PlaceholderConfiguration {

    @Bean
    @ConditionalOnMissingBean(IWorkVersion.class)
    public IWorkVersion placeholderWorkVersion() {
        return getPlaceholder(IWorkVersion.class, "A");
    }

    @Bean
    @ConditionalOnMissingBean(FileStore.class)
    public FileStore placeholderFileStore() {
        return getPlaceholder(FileStore.class, "A");
    }

    @Bean
    @ConditionalOnMissingBean(IAuthorization.class)
    public IAuthorization placeholderAuthorization() {
        return getPlaceholder(IAuthorization.class, "B");
    }

    @Bean
    @ConditionalOnMissingBean(IReviewResult.class)
    public IReviewResult placeholderReviewResult() {
        return getPlaceholder(IReviewResult.class, "B");
    }

    @Bean
    @ConditionalOnMissingBean(IApprovalStatus.class)
    public IApprovalStatus placeholderApprovalStatus() {
        return getPlaceholder(IApprovalStatus.class, "C");
    }

    @Bean
    @ConditionalOnMissingBean(ICertificateData.class)
    public ICertificateData placeholderCertificateData() {
        return getPlaceholder(ICertificateData.class, "C");
    }

    @Bean
    @ConditionalOnMissingBean(TokenService.class)
    public TokenService placeholderTokenService() {
        return getPlaceholder(TokenService.class, "D");
    }

    @Bean
    @ConditionalOnMissingBean(IAuditLog.class)
    public IAuditLog placeholderAuditLog() {
        return getPlaceholder(IAuditLog.class, "D");
    }

    @Bean
    @ConditionalOnMissingBean(INotification.class)
    public INotification placeholderNotification() {
        return getPlaceholder(INotification.class, "D");
    }

    /** stub 프로필은 StubPersistence가 있으므로 jdbc 프로필에서 JdbcPersistence(D3)가 생기기 전까지만 쓰인다. */
    @Bean
    @ConditionalOnMissingBean(IPersistence.class)
    public IPersistence placeholderPersistence() {
        return getPlaceholder(IPersistence.class, "D");
    }

    /** 부르면 "아직 구현되지 않았다"는 예외를 던지는 대역을 만든다. 대역인지는 toString으로 알 수 있다. */
    static <T> T getPlaceholder(Class<T> type, String owner) {
        String name = type.getSimpleName() + " 대역(담당 " + owner + ")";
        Object proxy = Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[] {type}, (self, method, args) -> {
            if (method.getDeclaringClass() == Object.class) {
                return getObjectMethodResult(self, method, args, name);
            }
            throw new UnsupportedOperationException(type.getSimpleName() + "." + method.getName()
                    + "은 아직 구현되지 않았습니다(담당 " + owner + "). 1단계에서는 테스트에서 Mockito로 대신하세요.");
        });
        return type.cast(proxy);
    }

    private static Object getObjectMethodResult(Object self, Method method, Object[] args, String name) {
        return switch (method.getName()) {
            case "toString" -> name;
            case "hashCode" -> System.identityHashCode(self);
            case "equals" -> self == args[0];
            default -> throw new UnsupportedOperationException(method.getName());
        };
    }
}
