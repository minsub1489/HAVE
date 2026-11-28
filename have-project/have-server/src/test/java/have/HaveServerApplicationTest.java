package have;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/** 서버가 stub 프로필(DB 없음)로 뜨는지, 상태 확인 주소와 공통 오류 응답이 약속한 모양인지 확인한다. */
@SpringBootTest
@AutoConfigureMockMvc
class HaveServerApplicationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void 상태_확인_주소가_응답한다() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.profile").value("stub"));
    }

    @Test
    void 없는_주소는_ApiError_모양의_404다() throws Exception {
        mockMvc.perform(get("/api/no-such-thing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.fields").isMap());
    }
}
