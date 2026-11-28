package have.bootstrap;

import java.util.List;

import have.work.status.WorkStatusObserver;
import have.work.status.WorkStatusSubject;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * 서버 조립 지점 (클래스 다이어그램 v3의 25번). 담당 D.
 * start(profile)이 하는 일: ① 프로필에 따라 저장 구현을 고른다 ② 옵서버 4종을 WorkStatusSubject에 등록한다.
 * ①은 @Profile로 한다: StubPersistence(@Profile("stub"), 들어 있음), JdbcPersistence(@Profile("jdbc"), D3).
 * 02는 옵서버 구현을 모르고 여기서만 연결하므로 02와 03 · 05 · 07 사이에 순환 의존이 생기지 않는다.
 */
@Component
public class HaveServerBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(HaveServerBootstrap.class);

    private final Environment environment;
    private final WorkStatusSubject subject;
    private final List<WorkStatusObserver> observers;

    public HaveServerBootstrap(Environment environment, WorkStatusSubject subject, List<WorkStatusObserver> observers) {
        this.environment = environment;
        this.subject = subject;
        this.observers = observers;
    }

    @Override
    public void run(ApplicationArguments args) {
        String[] active = environment.getActiveProfiles();
        start(active.length > 0 ? active[0] : environment.getDefaultProfiles()[0]);
    }

    public void start(String profile) {
        // ① 저장 구현 선택 — 각 구현에 붙인 @Profile로 정해진다. stub은 StubPersistence(들어 있음), jdbc는 JdbcPersistence(D3).
        //    JdbcPersistence가 생기기 전 jdbc 프로필에서는 공용 대역(PlaceholderConfiguration)이 들어간다.
        //    지금 jdbc 프로필의 DataSource는 스프링 부트가 application-jdbc.yml로 만든다. D3에서 DatabaseConnectionPool이 만든 것으로 바꾼다.
        // ② 옵서버 등록 — WorkStatusObserver를 구현한 스프링 빈을 모두 등록한다.
        for (WorkStatusObserver observer : observers) {
            subject.addObserver(observer);
        }
        log.info("HAVE 서버 조립: 프로필 {}, 옵서버 {}개 등록", profile, observers.size());
    }
}
