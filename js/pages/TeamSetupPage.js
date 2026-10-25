/**
 * 팀 설정 페이지
 */

import { $, createElement, clearElement } from '../utils/dom.js';
import { POSITIONS, POSITION_NAMES } from '../utils/constants.js';
import { state } from '../state.js';
import { teamService } from '../services/TeamService.js';

export class TeamSetupPage {
  constructor(router) {
    this.router = router;
  }

  /**
   * 페이지 렌더링
   * @param {Element} container
   */
  render(container) {
    clearElement(container);

    const currentState = state.get();

    const page = createElement('div', { className: 'page team-setup' }, [
      createElement('h2', { className: 'page__title' }, '팀 설정'),
      this.createForm(currentState),
      this.createSavedTeamsSection()
    ]);

    container.appendChild(page);
    this.attachEvents();
  }

  /**
   * 폼 생성
   * @param {Object} currentState
   * @returns {Element}
   */
  createForm(currentState) {
    return createElement('div', { className: 'team-setup__form' }, [
      this.createTeamCard('left', 'blueTeam', currentState.blueTeam),
      this.createTeamCard('right', 'redTeam', currentState.redTeam)
    ]);
  }

  /**
   * 팀 카드 생성
   * @param {'left'|'right'} side
   * @param {string} teamKey
   * @param {Object} teamData
   * @returns {Element}
   */
  createTeamCard(side, teamKey, teamData) {
    const sideLabel = side === 'left' ? '팀 A' : '팀 B';

    return createElement('div', {
      className: `team-card`,
      dataset: { dropTarget: teamKey }
    }, [
      // 팀 헤더 (비우기 버튼 포함)
      createElement('div', { className: 'team-card__header' }, [
        createElement('div', { className: 'team-card__title' }, [
          createElement('label', { className: 'team-card__label' }, sideLabel),
          this.createTeamTags(teamData)
        ]),
        createElement('button', {
          className: 'btn btn--sm btn--danger team-card__clear-btn',
          dataset: { clearTeam: teamKey },
          title: '입력 내용 비우기'
        }, '비우기')
      ]),
      // 팀 이름 입력
      createElement('div', { className: 'team-card__name-row' }, [
        createElement('input', {
          type: 'text',
          className: 'input team-card__input',
          placeholder: '팀 이름 입력',
          value: teamData.name,
          dataset: { team: teamKey, field: 'name' }
        }),
        createElement('button', {
          className: 'btn btn--save',
          dataset: { saveTeam: teamKey },
          title: '팀 저장'
        }, '💾')
      ]),
      // 선수 목록
      createElement('div', { className: 'player-list' },
        POSITIONS.map(position => this.createPlayerRow(teamKey, position, teamData.players))
      ),
      // 후보 선수
      this.createSubsSection(teamKey, teamData.subs || [])
    ]);
  }

  /**
   * 소속 리그·국가 태그 생성
   * @param {Object} team - { region?, country? }
   * @returns {Element|null}
   */
  createTeamTags(team) {
    const tags = [team.region, team.country].filter(Boolean);
    if (tags.length === 0) return null;
    return createElement('span', { className: 'team-tags' },
      tags.map(tag => createElement('span', { className: 'team-tag' }, tag))
    );
  }

  /**
   * 후보 선수 영역 생성 (칩을 누르면 같은 포지션 주전과 교체)
   * @param {string} teamKey
   * @param {Array} subs - [{ position, name }]
   * @returns {Element}
   */
  createSubsSection(teamKey, subs) {
    return createElement('div', { className: 'subs' }, [
      createElement('span', { className: 'subs__label' }, '후보'),
      createElement('div', { className: 'subs__list' }, [
        ...subs.map((sub, index) => createElement('button', {
          type: 'button',
          className: 'sub-chip',
          dataset: { team: teamKey, subIndex: index },
          title: `${POSITION_NAMES[sub.position]} 주전과 교체`
        }, [
          createElement('span', { className: 'sub-chip__position' }, POSITION_NAMES[sub.position]),
          createElement('span', { className: 'sub-chip__name' }, sub.name),
          createElement('span', {
            className: 'sub-chip__remove',
            dataset: { removeSub: index, team: teamKey },
            title: '후보 삭제'
          }, '×')
        ])),
        subs.length === 0 ? createElement('span', { className: 'subs__empty' }, '없음') : null
      ]),
      createElement('form', { className: 'subs__add', dataset: { team: teamKey } }, [
        createElement('select', { className: 'input subs__add-position', 'aria-label': '후보 포지션' },
          POSITIONS.map(position => createElement('option', { value: position }, POSITION_NAMES[position]))
        ),
        createElement('input', {
          type: 'text',
          className: 'input subs__add-input',
          placeholder: '후보 이름'
        }),
        createElement('button', { type: 'submit', className: 'btn btn--sm subs__add-btn' }, '+ 추가')
      ])
    ]);
  }

  /**
   * 선수 행 생성
   * @param {string} teamKey
   * @param {string} position
   * @param {Array} players
   * @returns {Element}
   */
  createPlayerRow(teamKey, position, players) {
    const player = players.find(p => p.position === position) || { name: '' };

    return createElement('div', { className: 'player-row' }, [
      createElement('span', { className: 'position-badge player-row__position' }, POSITION_NAMES[position]),
      createElement('input', {
        type: 'text',
        className: 'input player-row__input',
        placeholder: '선수 이름',
        value: player.name,
        dataset: { team: teamKey, position: position }
      })
    ]);
  }

  /**
   * 저장된 팀 목록 섹션 생성
   * @returns {Element}
   */
  createSavedTeamsSection() {
    const savedTeams = state.getSavedTeams();

    const header = createElement('div', { className: 'saved-teams__header' }, [
      createElement('h3', { className: 'saved-teams__title' }, '저장된 팀'),
      createElement('button', {
        className: 'btn btn--sm saved-teams__import-btn',
        id: 'import-worlds-btn',
        title: '롤드컵 진출팀 선수 정보를 저장된 팀에 추가'
      }, '롤드컵 팀 불러오기')
    ]);

    if (savedTeams.length === 0) {
      return createElement('div', { className: 'saved-teams saved-teams--empty' }, [
        header,
        createElement('p', { className: 'saved-teams__hint' }, '팀 정보를 입력하고 💾 버튼을 눌러 저장하세요')
      ]);
    }

    return createElement('div', { className: 'saved-teams' }, [
      header,
      createElement('p', { className: 'saved-teams__hint saved-teams__hint--list' },
        'A·B 버튼을 누르거나 팀 카드로 끌어다 놓으세요'),
      createElement('div', { className: 'saved-teams__list', id: 'saved-teams-list' },
        savedTeams.map(team => this.createSavedTeamItem(team))
      )
    ]);
  }

  /**
   * 저장된 팀 아이템 생성
   * @param {Object} team
   * @returns {Element}
   */
  createSavedTeamItem(team) {
    const playerNames = team.players
      .filter(p => p.name)
      .map(p => p.name)
      .join(', ');
    const subCount = team.subs?.length || 0;

    return createElement('div', {
      className: 'saved-team-item',
      draggable: 'true',
      dataset: { teamId: team.id }
    }, [
      createElement('div', { className: 'saved-team-item__info' }, [
        createElement('span', { className: 'saved-team-item__name' }, [
          createElement('span', {}, team.name),
          this.createTeamTags(team)
        ]),
        createElement('span', { className: 'saved-team-item__players' },
          (playerNames || '선수 미등록') + (subCount ? ` · 후보 ${subCount}` : ''))
      ]),
      // 팀 A/B 적용 버튼 (좁은 화면·터치에서도 드래그 없이 불러오기)
      createElement('div', { className: 'saved-team-item__apply' }, [
        createElement('button', {
          type: 'button',
          className: 'saved-team-item__apply-btn saved-team-item__apply-btn--a',
          dataset: { applyTeam: team.id, target: 'blueTeam' },
          title: '팀 A에 불러오기'
        }, 'A'),
        createElement('button', {
          type: 'button',
          className: 'saved-team-item__apply-btn saved-team-item__apply-btn--b',
          dataset: { applyTeam: team.id, target: 'redTeam' },
          title: '팀 B에 불러오기'
        }, 'B')
      ]),
      createElement('button', {
        className: 'saved-team-item__delete',
        dataset: { deleteTeam: team.id },
        title: '삭제'
      }, '×')
    ]);
  }

  /**
   * 이벤트 연결
   */
  attachEvents() {
    // 팀 이름 입력
    const teamInputs = document.querySelectorAll('.team-card__input');
    teamInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const teamKey = e.target.dataset.team;
        state.updateTeam(teamKey, { name: e.target.value });
      });
    });

    // 선수 이름 입력
    const playerInputs = document.querySelectorAll('.player-row__input');
    playerInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const teamKey = e.target.dataset.team;
        const position = e.target.dataset.position;
        const currentState = state.get();
        const players = [...currentState[teamKey].players];
        const playerIndex = players.findIndex(p => p.position === position);
        if (playerIndex !== -1) {
          players[playerIndex] = { ...players[playerIndex], name: e.target.value };
          state.updateTeam(teamKey, { players });
        }
      });
    });

    // 팀 비우기 버튼
    const clearButtons = document.querySelectorAll('[data-clear-team]');
    clearButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const teamKey = e.target.dataset.clearTeam;
        state.clearTeam(teamKey);
        this.render(document.querySelector('.main'));
      });
    });

    // 팀 저장 버튼
    const saveButtons = document.querySelectorAll('[data-save-team]');
    saveButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const teamKey = e.target.dataset.saveTeam;
        const success = state.saveTeamToList(teamKey);
        if (success) {
          this.render(document.querySelector('.main'));
        } else {
          alert('팀 이름을 입력하세요');
        }
      });
    });

    // 저장된 팀 삭제 버튼
    const deleteButtons = document.querySelectorAll('[data-delete-team]');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const teamId = parseInt(e.target.dataset.deleteTeam);
        state.deleteSavedTeam(teamId);
        this.render(document.querySelector('.main'));
      });
    });

    // 저장된 팀 A/B 적용 버튼
    document.querySelectorAll('[data-apply-team]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.applySavedTeam(parseInt(btn.dataset.applyTeam), btn.dataset.target);
      });
    });

    // 후보 칩: 클릭 시 주전과 교체, × 클릭 시 삭제
    document.querySelectorAll('.sub-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const remove = e.target.closest('.sub-chip__remove');
        if (remove) {
          state.removeSub(remove.dataset.team, Number(remove.dataset.removeSub));
        } else {
          state.swapWithSub(chip.dataset.team, Number(chip.dataset.subIndex));
        }
        this.render(document.querySelector('.main'));
      });
    });

    // 후보 추가
    document.querySelectorAll('.subs__add').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = form.querySelector('.subs__add-input').value;
        if (!name.trim()) return;
        state.addSub(form.dataset.team, form.querySelector('.subs__add-position').value, name);
        this.render(document.querySelector('.main'));
      });
    });

    // 롤드컵 팀 불러오기
    const importBtn = $('#import-worlds-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.importWorldsTeams(importBtn));
    }

    // 드래그앤드롭 이벤트
    this.attachDragEvents();
  }

  /**
   * 롤드컵 팀을 저장된 팀에 추가 (같은 이름이 있으면 덮어쓸지 선택)
   * @param {Element} button
   */
  async importWorldsTeams(button) {
    button.disabled = true;
    const data = await teamService.load();
    button.disabled = false;
    if (!data) {
      alert('롤드컵 팀 데이터를 불러올 수 없습니다.');
      return;
    }

    const savedNames = new Set(state.getSavedTeams().map(t => t.name));
    const duplicates = data.teams.filter(team => savedNames.has(team.name));

    const overwriteNames = duplicates.length > 0
      ? await this.askOverwrite(duplicates)
      : new Set();
    if (!overwriteNames) return; // 취소

    const result = state.importTeams(data.teams, overwriteNames);
    this.render(document.querySelector('.main'));
    alert(`롤드컵 팀 ${result.added}개 추가` +
      (result.overwritten ? `, ${result.overwritten}개 덮어씀` : '') +
      (result.skipped ? `, ${result.skipped}개 유지` : ''));
  }

  /**
   * 같은 이름 팀을 덮어쓸지 묻는 창 (팀별 체크)
   * @param {Array} duplicates - 이미 저장된 이름의 팀
   * @returns {Promise<Set<string>|null>} 덮어쓸 팀 이름, 취소하면 null
   */
  askOverwrite(duplicates) {
    return new Promise(resolve => {
      const checkboxes = duplicates.map(team => createElement('input', {
        type: 'checkbox',
        className: 'overwrite-dialog__check',
        value: team.name
      }));

      const overlay = createElement('div', { className: 'overwrite-dialog-overlay' });
      const close = (result) => {
        overlay.remove();
        resolve(result);
      };

      overlay.appendChild(createElement('div', { className: 'overwrite-dialog', role: 'dialog', 'aria-modal': 'true' }, [
        createElement('h3', { className: 'overwrite-dialog__title' }, '같은 이름의 팀이 이미 있습니다'),
        createElement('p', { className: 'overwrite-dialog__desc' },
          '덮어쓸 팀을 체크하세요. 체크하지 않은 팀은 기존 저장 내용을 그대로 둡니다.'),
        createElement('div', { className: 'overwrite-dialog__list' },
          duplicates.map((team, i) => createElement('label', { className: 'overwrite-dialog__item' }, [
            checkboxes[i],
            createElement('span', { className: 'overwrite-dialog__name' }, team.name),
            this.createTeamTags(team)
          ]))
        ),
        createElement('div', { className: 'overwrite-dialog__actions' }, [
          createElement('button', {
            className: 'btn btn--sm',
            onClick: () => {
              const checkAll = !checkboxes.every(c => c.checked);
              checkboxes.forEach(c => { c.checked = checkAll; });
            }
          }, '전체 선택/해제'),
          createElement('button', { className: 'btn btn--sm', onClick: () => close(null) }, '취소'),
          createElement('button', {
            className: 'btn btn--sm btn--primary',
            onClick: () => close(new Set(checkboxes.filter(c => c.checked).map(c => c.value)))
          }, '불러오기')
        ])
      ]));

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null);
      });
      document.body.appendChild(overlay);
    });
  }

  /**
   * 저장된 팀을 팀 카드에 적용하고, 적용된 카드를 강조 표시
   * @param {number} teamId
   * @param {string} teamKey - 'blueTeam' | 'redTeam'
   */
  applySavedTeam(teamId, teamKey) {
    if (!teamId || !teamKey) return;
    state.applySavedTeam(teamId, teamKey);
    this.render(document.querySelector('.main'));

    const card = document.querySelector(`.team-card[data-drop-target="${teamKey}"]`);
    if (!card) return;
    card.classList.add('team-card--applied');
    card.addEventListener('animationend', () => card.classList.remove('team-card--applied'), { once: true });

    // 좁은 화면에서 카드가 화면 밖이면 카드로 스크롤
    const rect = card.getBoundingClientRect();
    if (rect.top < 0 || rect.top > window.innerHeight - 80) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * 드래그 중 화면 위·아래 가장자리에 가까우면 페이지 자동 스크롤
   * @param {DragEvent} e
   */
  autoScrollOnDrag(e) {
    const EDGE = 60;
    const STEP = 20;
    if (e.clientY < EDGE) {
      window.scrollBy(0, -STEP);
    } else if (e.clientY > window.innerHeight - EDGE) {
      window.scrollBy(0, STEP);
    }
  }

  /**
   * 드래그앤드롭 이벤트 연결
   */
  attachDragEvents() {
    const savedTeamsList = $('#saved-teams-list');
    const teamCards = document.querySelectorAll('.team-card');

    if (!savedTeamsList) return;

    const onDocumentDragOver = (e) => this.autoScrollOnDrag(e);

    // 드래그 시작
    savedTeamsList.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.saved-team-item');
      if (item) {
        e.dataTransfer.setData('text/plain', item.dataset.teamId);
        item.classList.add('dragging');
        document.addEventListener('dragover', onDocumentDragOver);
      }
    });

    // 드래그 종료 (드롭 후 다시 렌더링되어도 dragend 는 원래 요소에서 발생)
    savedTeamsList.addEventListener('dragend', (e) => {
      document.removeEventListener('dragover', onDocumentDragOver);
      const item = e.target.closest('.saved-team-item');
      if (item) {
        item.classList.remove('dragging');
      }
    });

    // 팀 카드에 드롭
    teamCards.forEach(card => {
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        card.classList.add('team-card--drag-over');
      });

      card.addEventListener('dragleave', (e) => {
        card.classList.remove('team-card--drag-over');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('team-card--drag-over');

        const teamId = parseInt(e.dataTransfer.getData('text/plain'));
        this.applySavedTeam(teamId, card.dataset.dropTarget);
      });
    });
  }
}
