package have.work.status;

import have.common.code.WorkStatus;

import org.springframework.stereotype.Component;

/**
 * 옵서버 패턴의 ConcreteSubject. 작업 버전 상태를 바꾸는 유일한 지점이다 (IWorkVersion.setWorkStatus의 구현). 담당 A, 항목 A7.
 * 지금은 틀만 있다. A7에서 채울 것:
 *  1. 작업의 현재 버전을 읽고, 상태 다이어그램 ①에 있는 전이인지 검사한다(아니면 ApiException.conflict).
 *  2. 상태를 저장하고 StatusChange를 만든 뒤 notifyObservers()를 부른다. 모두 호출한 서비스의 트랜잭션 안이다.
 *  3. StatusChange의 받는 사람: 작성자는 WORK.owner_id, 검토자 · 최종 승인자는 IAuthorization.getMembers(workId, REVIEWER · APPROVER)의
 *     한 사람(없으면 null). IAuthorization은 생성자로 받는다(02 → 01은 허용된 의존). 1단계에는 공용 대역이 들어가므로 테스트에서 Mockito로 대신한다.
 *     03의 requestReview가 검토자를 지정한 다음에 setWorkStatus를 부르므로, 같은 트랜잭션 안에서 새 지정이 보인다.
 *  4. lastChange를 필드 하나로 두면 동시에 온 두 요청의 내용이 섞인다. setWorkStatus를 동기화하거나 요청마다 따로 보관한다.
 */
@Component
public class WorkStatusSubject extends Subject {

    private StatusChange lastChange;

    public void setWorkStatus(long workId, WorkStatus status) {
        setWorkStatus(workId, status, null);
    }

    /** 사유(취소 · 수정 요청 · 반려 등)를 StatusChange에 실어 옵서버에 전달한다. */
    public void setWorkStatus(long workId, WorkStatus status, String reason) {
        throw new UnsupportedOperationException("A7에서 구현합니다: 전이 검사 → 상태 저장 → StatusChange 생성 → notifyObservers()");
    }

    /** 방금 일어난 상태 변경. 옵서버가 update 안에서 읽는다 */
    public StatusChange getState() {
        return lastChange;
    }
}
