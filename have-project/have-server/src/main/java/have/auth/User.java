package have.auth;

import com.fasterxml.jackson.annotation.JsonIgnore;

/**
 * 사용자 (클래스 다이어그램 v3의 User, 테이블 "user"). 담당 B.
 * passwordHash는 BCrypt 해시다. 응답 본문에 실리지 않도록 JSON에서 뺐다(응답에는 userId · name · email만).
 */
public class User {

    private final long userId;
    private final String name;
    private final String email;
    private final String passwordHash;

    public User(long userId, String name, String email, String passwordHash) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
    }

    public long getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    @JsonIgnore
    public String getPasswordHash() {
        return passwordHash;
    }
}
