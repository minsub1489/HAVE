package have.common;

import java.util.Map;

import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** 서버가 떴는지와 어느 프로필인지 확인하는 주소. 로그인 없이 열린다(토큰 확인에서 빼야 하는 주소 중 하나). */
@RestController
public class HealthController {

    private final Environment environment;

    public HealthController(Environment environment) {
        this.environment = environment;
    }

    /** GET /api/health → { "status": "UP", "profile": "stub" } */
    @GetMapping("/api/health")
    public Map<String, String> getHealth() {
        String[] active = environment.getActiveProfiles();
        String profile = active.length > 0 ? String.join(",", active) : String.join(",", environment.getDefaultProfiles());
        return Map.of("status", "UP", "profile", profile);
    }
}
