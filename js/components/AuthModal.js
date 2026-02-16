/**
 * 인증 모달 컴포넌트
 */

import { authService } from '../services/authService.js';
import { createElement } from '../utils/dom.js';

class AuthModal {
  constructor() {
    this.modal = null;
    this.mode = 'login'; // 'login' | 'signup'
    this.onSuccess = null;
  }

  /**
   * 모달 열기
   * @param {Function} onSuccess - 로그인 성공 시 콜백
   */
  open(onSuccess) {
    this.onSuccess = onSuccess;
    this.mode = 'login';
    this.render();
  }

  /**
   * 모달 닫기
   */
  close() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  /**
   * 모달 렌더링
   */
  render() {
    this.close();

    this.modal = createElement('div', { className: 'auth-overlay' });
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    const container = createElement('div', { className: 'auth-modal' });

    // 헤더
    const header = createElement('div', { className: 'auth-modal__header' }, [
      createElement('h2', { className: 'auth-modal__title' },
        this.mode === 'login' ? '로그인' : '회원가입'
      ),
      createElement('button', {
        className: 'auth-modal__close',
        onClick: () => this.close()
      }, '\u00D7')
    ]);

    // Google 로그인 버튼
    const googleBtn = createElement('button', {
      className: 'auth-modal__google-btn',
      onClick: () => this.handleGoogleLogin()
    }, [
      createElement('span', { className: 'auth-modal__google-icon' }, 'G'),
      createElement('span', {}, 'Google\uB85C \uB85C\uADF8\uC778')
    ]);

    // 구분선
    const divider = createElement('div', { className: 'auth-modal__divider' }, [
      createElement('span', {}, '\uB610\uB294')
    ]);

    // 이메일 폼
    const form = createElement('form', {
      className: 'auth-modal__form',
      onSubmit: (e) => this.handleEmailSubmit(e)
    });

    const emailInput = createElement('input', {
      className: 'input auth-modal__input',
      type: 'email',
      placeholder: '\uC774\uBA54\uC77C',
      required: 'true',
      id: 'auth-email'
    });

    const passwordInput = createElement('input', {
      className: 'input auth-modal__input',
      type: 'password',
      placeholder: '\uBE44\uBC00\uBC88\uD638 (6\uC790 \uC774\uC0C1)',
      required: 'true',
      id: 'auth-password',
      minlength: '6'
    });

    const submitBtn = createElement('button', {
      className: 'btn btn--primary auth-modal__submit',
      type: 'submit'
    }, this.mode === 'login' ? '\uB85C\uADF8\uC778' : '\uD68C\uC6D0\uAC00\uC785');

    form.appendChild(emailInput);
    form.appendChild(passwordInput);
    form.appendChild(submitBtn);

    // 모드 전환
    const toggleText = this.mode === 'login'
      ? '\uACC4\uC815\uC774 \uC5C6\uC73C\uC2E0\uAC00\uC694?'
      : '\uC774\uBBF8 \uACC4\uC815\uC774 \uC788\uC73C\uC2E0\uAC00\uC694?';
    const toggleAction = this.mode === 'login' ? '\uD68C\uC6D0\uAC00\uC785' : '\uB85C\uADF8\uC778';

    const toggle = createElement('div', { className: 'auth-modal__toggle' }, [
      createElement('span', {}, toggleText + ' '),
      createElement('button', {
        className: 'auth-modal__toggle-btn',
        type: 'button',
        onClick: () => {
          this.mode = this.mode === 'login' ? 'signup' : 'login';
          this.render();
        }
      }, toggleAction)
    ]);

    // 에러 메시지 영역
    const errorArea = createElement('div', {
      className: 'auth-modal__error hidden',
      id: 'auth-error'
    });

    container.appendChild(header);
    container.appendChild(errorArea);
    container.appendChild(googleBtn);
    container.appendChild(divider);
    container.appendChild(form);
    container.appendChild(toggle);

    this.modal.appendChild(container);
    document.body.appendChild(this.modal);
  }

  /**
   * 에러 메시지 표시
   * @param {string} message
   */
  showError(message) {
    const errorArea = document.getElementById('auth-error');
    if (errorArea) {
      errorArea.textContent = message;
      errorArea.classList.remove('hidden');
    }
  }

  /**
   * 에러 메시지 숨김
   */
  hideError() {
    const errorArea = document.getElementById('auth-error');
    if (errorArea) {
      errorArea.classList.add('hidden');
    }
  }

  /**
   * 버튼 비활성화/활성화
   * @param {boolean} disabled
   */
  setLoading(disabled) {
    if (!this.modal) return;
    const buttons = this.modal.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = disabled);
  }

  /**
   * Google 로그인 처리
   */
  async handleGoogleLogin() {
    this.hideError();
    this.setLoading(true);

    try {
      await authService.signInWithGoogle();
      this.close();
      if (this.onSuccess) this.onSuccess();
    } catch (error) {
      this.showError(this.getErrorMessage(error.code));
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * 이메일 폼 제출 처리
   * @param {Event} e
   */
  async handleEmailSubmit(e) {
    e.preventDefault();
    this.hideError();
    this.setLoading(true);

    const email = document.getElementById('auth-email')?.value;
    const password = document.getElementById('auth-password')?.value;

    if (!email || !password) return;

    try {
      if (this.mode === 'login') {
        await authService.signInWithEmail(email, password);
      } else {
        await authService.signUpWithEmail(email, password);
      }
      this.close();
      if (this.onSuccess) this.onSuccess();
    } catch (error) {
      this.showError(this.getErrorMessage(error.code));
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Firebase 에러 코드를 한글 메시지로 변환
   * @param {string} code
   * @returns {string}
   */
  getErrorMessage(code) {
    const messages = {
      'auth/invalid-email': '\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uC774\uBA54\uC77C \uC8FC\uC18C\uC785\uB2C8\uB2E4.',
      'auth/user-disabled': '\uBE44\uD65C\uC131\uD654\uB41C \uACC4\uC815\uC785\uB2C8\uB2E4.',
      'auth/user-not-found': '\uB4F1\uB85D\uB418\uC9C0 \uC54A\uC740 \uC774\uBA54\uC77C\uC785\uB2C8\uB2E4.',
      'auth/wrong-password': '\uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.',
      'auth/invalid-credential': '\uC774\uBA54\uC77C \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.',
      'auth/email-already-in-use': '\uC774\uBBF8 \uC0AC\uC6A9 \uC911\uC778 \uC774\uBA54\uC77C\uC785\uB2C8\uB2E4.',
      'auth/weak-password': '\uBE44\uBC00\uBC88\uD638\uB294 6\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.',
      'auth/popup-closed-by-user': '\uB85C\uADF8\uC778 \uCC3D\uC774 \uB2EB\uD614\uC2B5\uB2C8\uB2E4.',
      'auth/cancelled-popup-request': '\uB85C\uADF8\uC778\uC774 \uCDE8\uC18C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.',
      'auth/network-request-failed': '\uB124\uD2B8\uC6CC\uD06C \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.'
    };
    return messages[code] || '\uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.';
  }
}

export const authModal = new AuthModal();
