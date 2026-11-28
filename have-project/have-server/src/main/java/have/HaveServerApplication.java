package have;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * HAVE 서버의 시작점. 서브시스템 01~08과 서버 조립 지점(bootstrap)이 이 아래 패키지에 있다.
 * 시각은 UTC로 저장하고 화면에서 KST로 보여 주므로(DB 문서 6단계), JVM 기본 시간대를 UTC로 고정한다.
 */
@SpringBootApplication
public class HaveServerApplication {

    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(HaveServerApplication.class, args);
    }
}
