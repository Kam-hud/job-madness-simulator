const API_BASE = 'http://localhost:8000';
const LEVEL_NAMES = {
    1: { icon: '🛡️', name: '同事甩锅' },
    2: { icon: '📋', name: '紧急任务' },
    3: { icon: '💡', name: '战略视野' },
    4: { icon: '🔗', name: '跨部门协作' },
    5: { icon: '🔥', name: '客户危机' },
    6: { icon: '👨‍💼', name: '团队管理' },
    7: { icon: '🏆', name: '跨职能领导' }
};
const skillElements = {
    conflict: {
        card: document.getElementById('skill-conflict'),
        status: document.getElementById('skill-conflict').querySelector('.skill-status')
    },
    eq: {
        card: document.getElementById('skill-eq'),
        status: document.getElementById('skill-eq').querySelector('.skill-status')
    },
    negotiation: {
        card: document.getElementById('skill-negotiation'),
        status: document.getElementById('skill-negotiation').querySelector('.skill-status')
    },
    mobilization: {
        card: document.getElementById('skill-mobilization'),
        status: document.getElementById('skill-mobilization').querySelector('.skill-status')
    },
    boundary: {
        card: document.getElementById('skill-boundary'),
        status: document.getElementById('skill-boundary').querySelector('.skill-status')
    },
    public_speaking: {
        card: document.getElementById('skill-speaking'),
        status: document.getElementById('skill-speaking').querySelector('.skill-status')
    }
};
let currentLevel = 1;
let abilities = {
    core_business: 50,
    project_management: 50,
    team_influence: 50,
    strategic_depth: 50
};
let skills = {
    conflict: 'locked',
    eq: 'locked',
    negotiation: 'locked',
    mobilization: 'locked',
    boundary: 'locked',
    public_speaking: 'locked'
};
let gameCoins = 1000;
let rechargedCoins = 0;
let lastBackendCoins = 1000;
let elements = null;
let levelHistory = [];
let abilitySnapshots = [];
let evaluationScores = [];

// ==================== localStorage 存档 ====================
function saveGameState() {
    const state = {
        currentLevel,
        abilities: { ...abilities },
        skills: { ...skills },
        gameCoins,
        rechargedCoins,
        levelHistory: [...levelHistory],
        abilitySnapshots: [...abilitySnapshots],
        evaluationScores: [...evaluationScores]
    };
    localStorage.setItem('jobMadnessGameState', JSON.stringify(state));
}

function restoreGameState() {
    try {
        const saved = localStorage.getItem('jobMadnessGameState');
        if (!saved) return false;
        const state = JSON.parse(saved);
        currentLevel = state.currentLevel || 1;
        abilities = state.abilities || { core_business: 50, project_management: 50, team_influence: 50, strategic_depth: 50 };
        skills = state.skills || { conflict: 'locked', eq: 'locked', negotiation: 'locked', mobilization: 'locked', boundary: 'locked', public_speaking: 'locked' };
        gameCoins = state.gameCoins || 1000;
        rechargedCoins = state.rechargedCoins || 0;
        levelHistory = state.levelHistory || [];
        abilitySnapshots = state.abilitySnapshots || [];
        evaluationScores = state.evaluationScores || [];
        return true;
    } catch (e) {
        return false;
    }
}

function clearGameState() {
    localStorage.removeItem('jobMadnessGameState');
}

// ==================== 音效系统 ====================
const SoundFX = {
    ctx: null,
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        // 浏览器自动挂起策略：页面重载后 AudioContext 可能处于 suspended，需手动恢复
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    play(type) {
        if (!this.ctx || this.ctx.state !== 'running') this.init();
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        switch(type) {
            case 'click':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.08);
                break;
            case 'submit':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(440, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
                break;
            case 'pass':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523, ctx.currentTime);
                osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
                osc.frequency.setValueAtTime(784, ctx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.5);
                break;
            case 'fail':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.4);
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.4);
                break;
            case 'gameover':
                const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
                notes.forEach((freq, i) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.connect(g);
                    g.connect(ctx.destination);
                    o.type = 'sine';
                    o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
                    g.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1);
                    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.2);
                    o.start(ctx.currentTime + i * 0.1);
                    o.stop(ctx.currentTime + i * 0.1 + 0.2);
                });
                break;
        }
    }
};

function updateAbilities(delta) {
    console.log('📊 更新能力值:', delta);
    if (delta.core_business !== undefined) {
        abilities.core_business = Math.max(0, Math.min(100, abilities.core_business + delta.core_business));
        updateAbilityDisplay('core', abilities.core_business, delta.core_business);
    }
    if (delta.project_management !== undefined) {
        abilities.project_management = Math.max(0, Math.min(100, abilities.project_management + delta.project_management));
        updateAbilityDisplay('project', abilities.project_management, delta.project_management);
    }
    if (delta.team_influence !== undefined) {
        abilities.team_influence = Math.max(0, Math.min(100, abilities.team_influence + delta.team_influence));
        updateAbilityDisplay('team', abilities.team_influence, delta.team_influence);
    }
    if (delta.strategic_depth !== undefined) {
        abilities.strategic_depth = Math.max(0, Math.min(100, abilities.strategic_depth + delta.strategic_depth));
        updateAbilityDisplay('strategy', abilities.strategic_depth, delta.strategic_depth);
    }
}
function updateAbilityDisplay(type, value, change) {
    const valueEl = elements[`${type}Value`];
    const changeEl = elements[`${type}Change`];
    const barEl = elements[`${type}Bar`];
    if (valueEl) valueEl.textContent = Math.round(value);
    if (changeEl && change !== undefined && change !== 0) {
        changeEl.textContent = change > 0 ? `+${change}` : change;
        changeEl.className = `ability-change ${change < 0 ? 'negative' : ''} visible`;
        setTimeout(() => {
            changeEl.classList.remove('visible');
        }, 2000);
    }
    if (barEl) barEl.style.width = `${Math.round(value)}%`;
}
function updateSkills(newSkills) {
    console.log('🎓 更新技能矩阵:', newSkills);
    for (const [key, value] of Object.entries(newSkills)) {
        if (skillElements[key]) {
            const isExpanded = value === 'expanded';
            skillElements[key].status.textContent = isExpanded ? '已扩展' : '已锁定';
            skillElements[key].status.className = `skill-status ${value}`;
            skillElements[key].card.className = `skill-card ${isExpanded ? 'expanded' : ''}`;
            skills[key] = value;
        }
    }
}
function updateLevel(newLevel) {
    currentLevel = newLevel;
    elements.currentLevel.textContent = newLevel;
    elements.challengeLevel.textContent = `Level ${newLevel}`;
    updateTimeline(newLevel);
    updateDifficultyStars(newLevel);
}
function updateTimeline(level) {
    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach((item, index) => {
        const itemLevel = index + 1;
        if (itemLevel < level) {
            item.classList.add('completed');
            item.classList.remove('active');
        } else if (itemLevel === level) {
            item.classList.add('active');
            item.classList.remove('completed');
        } else {
            item.classList.remove('active', 'completed');
        }
    });
}
function updateDifficultyStars(difficulty) {
    const stars = document.querySelectorAll('.difficulty-stars .star');
    stars.forEach((star, index) => {
        star.classList.toggle('filled', index < difficulty);
    });
}
function displayChallenge(event) {
    console.log('🎮 显示挑战:', event);
    if (!elements.challengeTitle || !elements.challengeDescription) {
        console.error('❌ 挑战元素不存在');
        return;
    }
    let title = event.title || '职业挑战';

    elements.challengeTitle.textContent = title;
    elements.challengeDescription.textContent = event.description || '暂无挑战描述';
    console.log('✅ 挑战显示完成');
}
function showComment(comment) {
    elements.commentContent.textContent = comment;
    elements.commentBox.style.display = 'block';
}
function hideComment() {
    elements.commentBox.style.display = 'none';
}
async function fetchCurrentLevelEvent(level) {
    try {
        const response = await fetch(`${API_BASE}/api/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_input: '系统恢复 - 继续挑战',
                current_coins: gameCoins + rechargedCoins
            })
        });
        const data = await response.json();
        if (data.current_event) {
            return data.current_event;
        }
        return null;
    } catch (error) {
        console.warn('获取当前关卡事件失败，将使用默认事件:', error);
        return null;
    }
}
async function startGame() {
    console.log('🚀 启动游戏...');
    elements.challengeTitle.textContent = '加载中...';
    elements.challengeDescription.textContent = '正在加载挑战数据...';
    hideComment();
    elements.playerInput.value = '';

    // 检查是否有本地存档
    const hasSave = restoreGameState();

    try {
        const startLevel = hasSave ? currentLevel : 1;
        console.log(`📡 正在调用 API: ${API_BASE}/api/start?level=${startLevel}`);
        const response = await fetch(`${API_BASE}/api/start?level=${startLevel}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json; charset=utf-8'
            },
            mode: 'cors'
        });
        console.log('📡 响应状态:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP 错误: ${response.status}`);
        }
        const text = await response.text();
        console.log('📥 原始响应文本:', text);
        const data = JSON.parse(text);
        console.log('📥 解析后的数据:', data);

        if (hasSave) {
            // 有存档：保留存档的能力值、金币和关卡，不从后端覆盖
            updateAbilityDisplay('core', abilities.core_business, 0);
            updateAbilityDisplay('project', abilities.project_management, 0);
            updateAbilityDisplay('team', abilities.team_influence, 0);
            updateAbilityDisplay('strategy', abilities.strategic_depth, 0);
            updateCoinsDisplay();
            updateSkills(skills);
            updateLevel(currentLevel);
            showToast(`已恢复存档：Level ${currentLevel}`, 'info');
        } else if (data.abilities) {
            abilities = { ...data.abilities };
            updateAbilityDisplay('core', abilities.core_business, 0);
            updateAbilityDisplay('project', abilities.project_management, 0);
            updateAbilityDisplay('team', abilities.team_influence, 0);
            updateAbilityDisplay('strategy', abilities.strategic_depth, 0);
        }
        if (!hasSave && data.skills) {
            updateSkills(data.skills);
        }
        if (!hasSave && data.current_level) {
            updateLevel(data.current_level);
        }
        if (data.current_event) {
            console.log('🎮 准备显示挑战:', data.current_event);
            displayChallenge(data.current_event);
        } else {
            console.error('❌ current_event 为空');
            elements.challengeDescription.textContent = '暂无挑战数据';
        }
        if (!hasSave && data.coins !== undefined) {
            initCoins(data.coins);
        }
    } catch (error) {
        console.error('❌ 启动游戏失败:', error);
        console.error('❌ 错误详情:', error.stack);
        console.log('🔄 尝试使用模拟数据...');
        const mockData = {
            abilities: { core_business: 50, project_management: 50, team_influence: 50, strategic_depth: 50 },
            skills: { conflict: 'locked', eq: 'locked', negotiation: 'locked', mobilization: 'locked', boundary: 'locked', public_speaking: 'locked' },
            current_level: 1,
            current_event: {
                level: 1,
                title: 'Level 1 - 同事甩锅',
                description: '项目出了问题，同事在会议上把责任推给了你，老板正盯着你等待解释。',
                difficulty: 1
            },
            coins: 1000
        };
        abilities = { ...mockData.abilities };
        updateAbilityDisplay('core', mockData.abilities.core_business, 0);
        updateAbilityDisplay('project', mockData.abilities.project_management, 0);
        updateAbilityDisplay('team', mockData.abilities.team_influence, 0);
        updateAbilityDisplay('strategy', mockData.abilities.strategic_depth, 0);
        updateSkills(mockData.skills);
        updateLevel(mockData.current_level);
        displayChallenge(mockData.current_event);
        initCoins(mockData.coins);
        elements.challengeDescription.textContent = '(使用模拟数据) ' + mockData.current_event.description;
    }
}
async function submitAction() {
    if (gameCoins + rechargedCoins <= 0) {
        showToast('职业金币不足，请先前往「充值中心」充值', 'error');
        return;
    }
    const input = elements.playerInput.value.trim();
    if (!input) {
        alert('请输入你的策略性回应！');
        return;
    }
    SoundFX.play('submit');
    elements.submitBtn.disabled = true;
    elements.submitBtn.textContent = '策略实施中...';
    try {
        const totalCoins = gameCoins + rechargedCoins;
        const response = await fetch(`${API_BASE}/api/action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                player_input: input,
                current_coins: totalCoins
            })
        });
        const data = await response.json();
        console.log("后端响应数据:", data);
        if (data.evaluation) {
            const evalData = data.evaluation;
            console.log('📊 评价数据:', evalData);
            if (evalData.is_burnout) {
                console.log('🔥 检测到职业倦怠状态！');
                activateBurnoutMode();
            } else {
                deactivateBurnoutMode();
            }
            if (evalData.abilities_change) {
                console.log('📈 能力变化:', evalData.abilities_change);
                if (evalData.abilities_change.core_business !== undefined) {
                    document.getElementById('core-value').innerText = parseInt(document.getElementById('core-value').innerText) + evalData.abilities_change.core_business;
                    abilities.core_business = parseInt(document.getElementById('core-value').innerText);
                    updateAbilityDisplay('core', abilities.core_business, evalData.abilities_change.core_business);
                }
                if (evalData.abilities_change.project_management !== undefined) {
                    document.getElementById('project-value').innerText = parseInt(document.getElementById('project-value').innerText) + evalData.abilities_change.project_management;
                    abilities.project_management = parseInt(document.getElementById('project-value').innerText);
                    updateAbilityDisplay('project', abilities.project_management, evalData.abilities_change.project_management);
                }
                if (evalData.abilities_change.team_influence !== undefined) {
                    document.getElementById('team-value').innerText = parseInt(document.getElementById('team-value').innerText) + evalData.abilities_change.team_influence;
                    abilities.team_influence = parseInt(document.getElementById('team-value').innerText);
                    updateAbilityDisplay('team', abilities.team_influence, evalData.abilities_change.team_influence);
                }
                if (evalData.abilities_change.strategic_depth !== undefined) {
                    document.getElementById('strategy-value').innerText = parseInt(document.getElementById('strategy-value').innerText) + evalData.abilities_change.strategic_depth;
                    abilities.strategic_depth = parseInt(document.getElementById('strategy-value').innerText);
                    updateAbilityDisplay('strategy', abilities.strategic_depth, evalData.abilities_change.strategic_depth);
                }
            }
            if (evalData.skills_matrix) {
                console.log('🎯 技能矩阵更新:', evalData.skills_matrix);
                updateSkills(evalData.skills_matrix);
            }
            if (evalData.comment) {
                if (document.getElementById('ai-comment')) {
                    document.getElementById('ai-comment').innerText = evalData.comment;
                }
                showComment(evalData.comment);
            }
            if (evalData.next_event) {
                if (document.getElementById('event-display')) {
                    document.getElementById('event-display').innerText = evalData.next_event;
                }
            }
        }
        if (data.coins !== undefined) {
            gameCoins = data.coins;
            rechargedCoins = 0;
            lastBackendCoins = data.coins;
            updateCoinsDisplay();
            console.log(`💰 后端返回金币: ${data.coins}，已同步`);
        }
        // 能力值和技能已通过 abilities_change / skills_matrix 增量更新，不再用后端全量覆盖
        if (data.game_over) {
            SoundFX.play('gameover');
            recordLevelHistory(data);
            window._pendingGameOverData = data;
            setTimeout(() => {
                const reportBtn = document.getElementById('view-report-btn');
                if (reportBtn) {
                    reportBtn.style.display = 'block';
                }
            }, 2000);
        } else if (data.pass_condition_met === false) {
            const abilityNameMap = { core_business: '核心业务', project_management: '项目管理', team_influence: '团队协同', strategic_depth: '战略思维' };
            const abName = abilityNameMap[data.pass_ability_required] || data.pass_ability_required || '能力';
            const currentVal = abilities[data.pass_ability_required] || 0;
            const threshold = data.pass_threshold || 0;
            showToast(`${abName}不足（当前${currentVal}，需要≥${threshold}），请重新挑战本关`, 'error');
            // 清空输入框，但保留AI点评
            elements.playerInput.value = '';
            // 红框闪烁效果加在挑战区域
            const challengeCard = document.querySelector('.event-card') || document.getElementById('event-display')?.parentElement;
            if (challengeCard) {
                challengeCard.style.transition = 'border-color 0.3s, box-shadow 0.3s';
                challengeCard.style.borderColor = '#ef4444';
                challengeCard.style.boxShadow = '0 0 20px rgba(239,68,68,0.3)';
                setTimeout(() => {
                    challengeCard.style.borderColor = '';
                    challengeCard.style.boxShadow = '';
                }, 2000);
            }
            saveGameState();
            SoundFX.play('fail');
            elements.submitBtn.disabled = false;
            elements.submitBtn.textContent = '⚡ 实施职业对策';
        } else {
            SoundFX.play('pass');
            // 立即更新关卡变量并保存，UI更新延迟到点评展示结束后
            if (data.current_level) {
                currentLevel = data.current_level;
            }
            saveGameState();
            setTimeout(() => {
                hideComment();
                recordLevelHistory(data);
                if (data.current_level) {
                    updateLevel(data.current_level);
                    const timelineItems = document.querySelectorAll('.timeline-item');
                    timelineItems.forEach(item => {
                        item.classList.remove('active');
                    });
                    const currentItem = document.querySelector(`.timeline-item[data-level="${data.current_level}"]`);
                    if (currentItem) {
                        currentItem.classList.add('active');
                    }
                }
                if (data.current_event) {
                    displayChallenge(data.current_event);
                }
                elements.playerInput.value = '';
            }, 10000);
        }
    } catch (error) {
        console.error('❌ 提交回应失败:', error);
        showComment('网络错误，请检查后端服务是否启动');
        elements.playerInput.value = '';
    }
    elements.submitBtn.disabled = false;
    elements.submitBtn.textContent = '⚡ 实施职业对策';
}
function recordLevelHistory(data) {
    const comment = (data.evaluation && data.evaluation.comment) ? data.evaluation.comment : '';
    const abilitiesChange = (data.evaluation && data.evaluation.abilities_change) 
        ? data.evaluation.abilities_change : {};
    const snapshot = {
        core_business: abilities.core_business,
        project_management: abilities.project_management,
        team_influence: abilities.team_influence,
        strategic_depth: abilities.strategic_depth
    };
    abilitySnapshots.push(snapshot);
    let evalScore = 50;
    const positiveWords = ['出色', '优秀', '卓越', '很棒', '完美', '精彩', '厉害', '高明', '成熟', '专业', '冷静', '果断', '机智', '成功', '突破'];
    const negativeWords = ['不足', '欠缺', '失败', '遗憾', '糟糕', '差劲', '失误', '冲动'];
    positiveWords.forEach(w => { if (comment.includes(w)) evalScore += 8; });
    negativeWords.forEach(w => { if (comment.includes(w)) evalScore -= 8; });
    evalScore = Math.max(10, Math.min(100, evalScore));
    const totalAbilityChange = Object.values(abilitiesChange).reduce((sum, v) => sum + (v || 0), 0);
    evalScore += totalAbilityChange * 0.5;
    evalScore = Math.round(Math.max(10, Math.min(100, evalScore)));
    evaluationScores.push(evalScore);
    levelHistory.push({
        level: currentLevel,
        title: LEVEL_NAMES[currentLevel] ? LEVEL_NAMES[currentLevel].name : `Level ${currentLevel}`,
        icon: LEVEL_NAMES[currentLevel] ? LEVEL_NAMES[currentLevel].icon : '📌',
        comment: comment,
        evalScore: evalScore,
        abilitiesChange: abilitiesChange,
        abilitiesAfter: { ...snapshot }
    });
}
function showGameOver(data) {
    if (levelHistory.length === 0 || levelHistory[levelHistory.length - 1].level !== currentLevel) {
        recordLevelHistory(data);
    }
    if (abilitySnapshots.length === 0) {
        abilitySnapshots.push({
            core_business: 50,
            project_management: 50,
            team_influence: 50,
            strategic_depth: 50
        });
    }
    const totalScore = Math.round(
        (abilities.core_business + abilities.project_management +
         abilities.team_influence + abilities.strategic_depth) / 4
    );
    document.getElementById('report-player').textContent = '挑战者';
    const now = new Date();
    document.getElementById('report-time').textContent = 
        `${now.getFullYear()}年${String(now.getMonth()+1).padStart(2,'0')}月${String(now.getDate()).padStart(2,'0')}日 ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    document.getElementById('report-total-score').textContent = totalScore;
    renderRadarChart();
    renderLevelReviews();
    renderHighlight();
    renderGrowthChart();
    renderSummary(data, totalScore);
    renderSuggestions(totalScore);
    renderEnding(data);
    document.getElementById('modal-overlay').style.display = 'flex';
}
function renderRadarChart() {
    const svg = document.getElementById('radar-svg');
    const labels = ['核心业务', '项目管理', '团队影响', '战略思维'];
    const values = [
        abilities.core_business,
        abilities.project_management,
        abilities.team_influence,
        abilities.strategic_depth
    ];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    const cx = 150, cy = 150, r = 110;
    const n = 4;
    let gridHtml = '';
    for (let level = 1; level <= 5; level++) {
        const lr = (r / 5) * level;
        let points = '';
        for (let i = 0; i < n; i++) {
            const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
            const px = cx + lr * Math.cos(angle);
            const py = cy + lr * Math.sin(angle);
            points += `${px},${py} `;
        }
        gridHtml += `<polygon points="${points.trim()}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
    }
    let axisHtml = '';
    for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        axisHtml += `<line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
    }
    let dataPoints = '';
    for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
        const vr = (r * values[i]) / 100;
        const px = cx + vr * Math.cos(angle);
        const py = cy + vr * Math.sin(angle);
        dataPoints += `${px},${py} `;
    }
    let dotsHtml = '';
    for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
        const vr = (r * values[i]) / 100;
        const px = cx + vr * Math.cos(angle);
        const py = cy + vr * Math.sin(angle);
        dotsHtml += `<circle cx="${px}" cy="${py}" r="4" fill="${colors[i]}" stroke="#fff" stroke-width="1.5"/>`;
    }
    let labelHtml = '';
    for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
        const lx = cx + (r + 25) * Math.cos(angle);
        const ly = cy + (r + 25) * Math.sin(angle);
        const anchor = i === 0 ? 'middle' : (i === 2 ? 'middle' : (i === 1 ? 'start' : 'end'));
        labelHtml += `<text x="${lx}" y="${ly}" text-anchor="${anchor}" fill="#94a3b8" font-size="12" dominant-baseline="middle">${labels[i]}</text>`;
    }
    svg.innerHTML = gridHtml + axisHtml +
        `<polygon points="${dataPoints.trim()}" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.6)" stroke-width="2"/>` +
        dotsHtml + labelHtml;
    const legendDiv = document.getElementById('radar-legend');
    legendDiv.innerHTML = labels.map((label, i) => `
        <div class="radar-legend-item">
            <span class="radar-legend-dot" style="background:${colors[i]}"></span>
            <span>${label}</span>
            <span class="radar-legend-value">${Math.round(values[i])}</span>
        </div>
    `).join('');
}
function renderLevelReviews() {
    const container = document.getElementById('level-review-list');
    const maxEval = Math.max(...evaluationScores, 1);
    const highlightLevel = evaluationScores.indexOf(maxEval) + 1;
    const items = levelHistory.map((h, idx) => {
        const isHighlight = (idx + 1) === highlightLevel && h.evalScore >= 60;
        const changes = h.abilitiesChange;
        const changeItems = [];
        const changeLabels = {
            core_business: '核心',
            project_management: '项目',
            team_influence: '团队',
            strategic_depth: '战略'
        };
        for (const [key, label] of Object.entries(changeLabels)) {
            if (changes[key] && changes[key] !== 0) {
                const dir = changes[key] > 0 ? 'up' : 'down';
                const sign = changes[key] > 0 ? '+' : '';
                changeItems.push(`<span class="level-review-change ${dir}">${label} ${sign}${changes[key]}</span>`);
            }
        }
        return `
            <div class="level-review-card${isHighlight ? ' highlight' : ''}">
                <div class="level-review-icon">${h.icon}</div>
                <div class="level-review-info">
                    <div class="level-review-name">Lv${h.level} · ${h.title}</div>
                    <div class="level-review-summary">${h.comment || '—— 完成挑战 ——'}</div>
                </div>
                <div class="level-review-changes">${changeItems.join('') || '<span style="color:#64748b;font-size:0.8rem">无变化</span>'}</div>
            </div>
        `;
    });
    container.innerHTML = items.join('');
}
function renderHighlight() {
    const maxEval = Math.max(...evaluationScores, 1);
    const idx = evaluationScores.indexOf(maxEval);
    if (idx < 0 || levelHistory.length === 0) {
        document.getElementById('highlight-section').style.display = 'none';
        return;
    }
    document.getElementById('highlight-section').style.display = '';
    const h = levelHistory[idx];
    document.getElementById('highlight-card').innerHTML = `
        <div class="highlight-badge">🌟</div>
        <div class="highlight-title">Lv${h.level} · ${h.title}</div>
        <div class="highlight-desc">${h.comment || '在这一关中，你展现了卓越的职业素养和应变能力，赢得了最高的评价。'}</div>
    `;
}
function renderGrowthChart() {
    const svg = document.getElementById('growth-svg');
    const w = 600, h = 240;
    const pad = { top: 20, right: 30, bottom: 40, left: 40 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;
    const keys = ['core_business', 'project_management', 'team_influence', 'strategic_depth'];
    const labels = ['核心业务', '项目管理', '团队影响', '战略思维'];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    if (abilitySnapshots.length < 2) {
        svg.innerHTML = `<text x="${w/2}" y="${h/2}" text-anchor="middle" fill="#64748b" font-size="14">数据不足，无法绘制成长轨迹</text>`;
        return;
    }
    let yGrid = '';
    for (let v = 0; v <= 100; v += 20) {
        const y = pad.top + plotH - (plotH * v / 100);
        yGrid += `<line x1="${pad.left}" y1="${y}" x2="${w - pad.right}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
        yGrid += `<text x="${pad.left - 8}" y="${y}" text-anchor="end" fill="#64748b" font-size="10" dominant-baseline="middle">${v}</text>`;
    }
    let xLabels = '';
    const stepX = abilitySnapshots.length > 1 ? plotW / (abilitySnapshots.length - 1) : plotW;
    abilitySnapshots.forEach((_, i) => {
        const x = pad.left + i * stepX;
        xLabels += `<text x="${x}" y="${h - 8}" text-anchor="middle" fill="#64748b" font-size="10">Lv${i+1}</text>`;
    });
    let lines = '';
    keys.forEach((key, ki) => {
        let pathD = '';
        abilitySnapshots.forEach((snap, i) => {
            const x = pad.left + i * stepX;
            const y = pad.top + plotH - (plotH * snap[key] / 100);
            pathD += (i === 0 ? 'M' : 'L') + `${x},${y} `;
        });
        lines += `<path d="${pathD.trim()}" fill="none" stroke="${colors[ki]}" stroke-width="2" stroke-linejoin="round"/>`;
        abilitySnapshots.forEach((snap, i) => {
            const x = pad.left + i * stepX;
            const y = pad.top + plotH - (plotH * snap[key] / 100);
            lines += `<circle cx="${x}" cy="${y}" r="3" fill="${colors[ki]}"/>`;
            if (i === abilitySnapshots.length - 1) {
                lines += `<text x="${x + 6}" y="${y - 6}" fill="${colors[ki]}" font-size="9">${Math.round(snap[key])}</text>`;
            }
        });
    });
    let legendHtml = '';
    keys.forEach((_, i) => {
        legendHtml += `<rect x="${pad.left + i * 90}" y="${h - 4}" width="10" height="10" rx="2" fill="${colors[i]}"/>`;
        legendHtml += `<text x="${pad.left + i * 90 + 14}" y="${h + 5}" fill="#94a3b8" font-size="10">${labels[i]}</text>`;
    });
    svg.innerHTML = yGrid + xLabels + lines + legendHtml;
}
function renderSummary(data, totalScore) {
    const abNames = { core_business: '核心业务能力', project_management: '项目管理能力', team_influence: '团队协同影响力', strategic_depth: '战略思维深度' };
    const abKeys = ['core_business', 'project_management', 'team_influence', 'strategic_depth'];

    let grade;
    if (totalScore >= 85) grade = '卓越';
    else if (totalScore >= 70) grade = '优秀';
    else if (totalScore >= 55) grade = '良好';
    else grade = '成长中';

    const summaryParts = [];

    if (abilitySnapshots.length >= 2) {
        const first = abilitySnapshots[0];
        const last = abilitySnapshots[abilitySnapshots.length - 1];
        const growthMap = {};
        abKeys.forEach(k => { growthMap[k] = (last[k] || 0) - (first[k] || 0); });

        const sortedByGrowth = abKeys.slice().sort((a, b) => growthMap[b] - growthMap[a]);
        const topGrowth = sortedByGrowth[0];
        const lowGrowth = sortedByGrowth[sortedByGrowth.length - 1];

        if (growthMap[topGrowth] >= 15) {
            summaryParts.push(`${abNames[topGrowth]}是你的核心优势，在挑战过程中取得了${Math.round(growthMap[topGrowth])}分的显著提升。`);
        } else if (growthMap[topGrowth] >= 8) {
            summaryParts.push(`${abNames[topGrowth]}稳步增长，提升了${Math.round(growthMap[topGrowth])}分，展现了良好的学习能力。`);
        }

        if (growthMap[lowGrowth] < 3) {
            summaryParts.push(`${abNames[lowGrowth]}增长相对有限，仅提升${Math.round(growthMap[lowGrowth])}分，是需要重点关注的维度。`);
        }

        const mid = Math.floor(abilitySnapshots.length / 2);
        const firstHalf = abilitySnapshots.slice(0, mid);
        const secondHalf = abilitySnapshots.slice(mid);
        const firstHalfAvg = abKeys.reduce((s, k) => s + firstHalf.reduce((ss, sn) => ss + (sn[k] || 0), 0) / firstHalf.length, 0) / abKeys.length;
        const secondHalfAvg = abKeys.reduce((s, k) => s + secondHalf.reduce((ss, sn) => ss + (sn[k] || 0), 0) / secondHalf.length, 0) / abKeys.length;

        if (last && first) {
            const totalGrowth = abKeys.reduce((s, k) => s + (last[k] || 0) - (first[k] || 0), 0);
            if (totalGrowth >= 60) {
                summaryParts.push('你在7关挑战中实现了全面突破，每项能力均有大幅提升，展现出惊人的成长潜力。');
            } else if (totalGrowth >= 30) {
                summaryParts.push('整体能力呈稳步上升趋势，在多个维度上都取得了可观的进步。');
            }
        }

        if (secondHalfAvg - firstHalfAvg >= 12) {
            summaryParts.push('你在后半程展现出强劲的加速势头，后期关卡的发挥明显优于前期，体现了出色的适应能力和学习曲线。');
        } else if (firstHalfAvg - secondHalfAvg >= 10) {
            summaryParts.push('前期表现亮眼但后期略显疲态，建议在高强度连续挑战中加强精力分配和节奏把控。');
        }

        if (evaluationScores.length >= 2) {
            const earlyScores = evaluationScores.slice(0, Math.floor(evaluationScores.length / 2));
            const lateScores = evaluationScores.slice(Math.floor(evaluationScores.length / 2));
            const earlyAvg = earlyScores.reduce((a, b) => a + b, 0) / earlyScores.length;
            const lateAvg = lateScores.reduce((a, b) => a + b, 0) / lateScores.length;
            if (lateAvg - earlyAvg >= 10) {
                summaryParts.push('你在初期遇到困难但后期展现出惊人的学习曲线，评价分数持续走高。');
            }
        }

        const levelCount = levelHistory.length;
        if (levelCount >= 3) {
            const lastThree = evaluationScores.slice(-3);
            const ascending = lastThree.every((v, i) => i === 0 || v >= lastThree[i - 1]);
            if (ascending && lastThree[lastThree.length - 1] >= 75) {
                summaryParts.push('最近几关评价持续走高，状态正佳，展现了强大的持续作战能力。');
            }
        }
    }

    if (summaryParts.length === 0) {
        if (totalScore >= 85) {
            summaryParts.push('你在所有职业挑战中展现了非凡的领导力和应变能力，已经完全具备高级管理者的素养。');
        } else if (totalScore >= 70) {
            summaryParts.push('你成功应对了大部分职业挑战，展现了扎实的业务功底和良好的团队协作能力。');
        } else if (totalScore >= 55) {
            summaryParts.push('你基本完成了挑战，在基础业务和团队沟通方面表现尚可，复杂局面下的决策还需加强。');
        } else {
            summaryParts.push('你在挑战中遇到了一些困难，这也是职业成长的必经之路，建议多积累实战经验。');
        }
    }

    const summary = summaryParts.join('<br><br>');
    document.getElementById('report-summary').innerHTML = `
        <strong style="color:#fbbf24;font-size:1.1rem;">评级：${grade}</strong><br><br>
        ${summary}<br><br>
        最终达到 Level ${currentLevel}，综合能力评分 <strong style="color:#fbbf24;">${totalScore}</strong> / 100。
    `;
}

function renderSuggestions(totalScore) {
    const suggestions = [];
    const abNames = { core_business: '核心业务能力', project_management: '项目管理能力', team_influence: '团队协同影响力', strategic_depth: '战略思维深度' };
    const abKeys = ['core_business', 'project_management', 'team_influence', 'strategic_depth'];
    const ab = abilities;

    const weakAdvice = {
        core_business: ['加强核心业务能力的深度钻研，多参与实际项目积累经验。', '主动承担技术攻坚任务，在实践中提升专业素养。'],
        project_management: ['提升项目管理能力，学习使用甘特图、看板等工具规划工作。', '尝试拆分复杂项目为可管理的里程碑，逐步推进。'],
        team_influence: ['增强团队协同影响力，主动承担团队协调角色，多倾听他人意见。', '定期组织团队复盘会，提升沟通效率和凝聚力。'],
        strategic_depth: ['培养战略思维深度，多阅读行业报告，从宏观视角审视问题。', '每月做一次行业趋势分析，锻炼前瞻性判断力。']
    };

    abKeys.forEach(k => {
        if (ab[k] < 60) {
            suggestions.push(weakAdvice[k][0]);
        } else if (ab[k] < 75) {
            suggestions.push(weakAdvice[k][1]);
        }
    });

    if (abilitySnapshots.length >= 3) {
        const recent = abilitySnapshots.slice(-3);
        abKeys.forEach(k => {
            const vals = recent.map(s => s[k] || 0);
            const decline = vals[0] - vals[vals.length - 1];
            if (decline >= 5) {
                const existing = suggestions.find(s => s.includes(abNames[k]));
                if (!existing) {
                    suggestions.push(`${abNames[k]}近期出现下滑趋势，建议回顾近期决策，找出影响因素并及时调整。`);
                }
            }
        });
    }

    if (evaluationScores.length >= 2) {
        const sortedScores = [...evaluationScores].sort((a, b) => a - b);
        const minScore = sortedScores[0];
        if (minScore < 50 && levelHistory.length > 0) {
            const worstIdx = evaluationScores.indexOf(minScore);
            if (worstIdx >= 0 && levelHistory[worstIdx]) {
                suggestions.push(`第${worstIdx + 1}关「${levelHistory[worstIdx].title}」评分最低，建议重点复盘该关卡的应对策略。`);
            }
        }
    }

    if (suggestions.length === 0) {
        suggestions.push('你已经全面均衡发展，建议选择一个方向做更深层次的专精突破。');
        suggestions.push('可以尝试承担更大规模的跨部门项目，锻炼综合领导力。');
    }

    suggestions.push('保持反思习惯，每次重要决策后记录思考过程，持续迭代优化。');

    document.getElementById('report-suggestions').innerHTML =
        suggestions.map((s, i) => `<div style="margin-bottom:8px;">${i+1}. ${s}</div>`).join('');
}

function renderEnding(data) {
    const vals = { ...abilities };
    const avg = (vals.core_business + vals.project_management + vals.team_influence + vals.strategic_depth) / 4;
    const entries = Object.entries(vals);
    let maxAbility = entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
    let minAbility = entries.reduce((a, b) => a[1] < b[1] ? a : b)[0];

    const abilityNames = { core_business: '核心业务', project_management: '项目管理', team_influence: '团队协同', strategic_depth: '战略思维' };
    const endingColors = { '全才型': '#fbbf24', '偏科型': '#f59e0b', '精英型': '#3b82f6', '均衡型': '#8b5cf6', '平庸型': '#64748b' };

    let endingType, endingTitle, endingDesc;

    if (Object.values(vals).every(v => v >= 70)) {
        endingType = '全才型';
        endingTitle = '六边形战士';
        endingDesc = '你在每一个维度上都展现出了顶级职场人的素养，无论是业务深耕还是战略眼光，都已达到令人仰望的高度。';
    } else if (Math.max(...Object.values(vals)) >= 80 && Math.min(...Object.values(vals)) < 40) {
        endingType = '偏科型';
        endingTitle = `${abilityNames[maxAbility]}专精者`;
        endingDesc = `你的${abilityNames[maxAbility]}能力出类拔萃，但其他维度明显薄弱。职场如木桶，短板决定了你的上限。`;
    } else if (Math.min(...Object.values(vals)) < 35) {
        endingType = '平庸型';
        endingTitle = '职场路人';
        endingDesc = '你在这次模拟中表现平平，没有突出的优势也没有致命短板——但职场不进则退，平庸是最危险的信号。';
    } else if (avg >= 55) {
        endingType = '精英型';
        endingTitle = '部门中坚';
        endingDesc = '你的综合能力稳扎稳打，虽然尚未达到顶尖水平，但已经具备了独当一面的实力，是团队中不可或缺的中坚力量。';
    } else {
        endingType = '均衡型';
        endingTitle = '稳步前行者';
        endingDesc = '你的各项能力发展均衡，虽无特别突出之处，但也没有明显短板。持续积累，未来可期。';
    }

    const color = endingColors[endingType] || '#8b5cf6';

    const typeEl = document.getElementById('ending-type');
    const titleEl = document.getElementById('ending-title');
    const descEl = document.getElementById('ending-desc');

    if (typeEl) typeEl.textContent = endingType;
    if (titleEl) titleEl.textContent = endingTitle;
    if (descEl) descEl.textContent = endingDesc;

    const endingCard = document.getElementById('ending-card');
    if (endingCard) {
        endingCard.style.borderColor = color;
        endingCard.style.boxShadow = `0 0 30px ${color}33`;
    }
}

async function exportReport() {
    const modalOverlay = document.getElementById('modal-overlay');
    const reportContainer = document.getElementById('report-container');
    const actionBar = document.getElementById('report-action-bar');
    const exportBtn = document.getElementById('export-btn');
    const shareDropdown = document.getElementById('share-dropdown');
    const debugBtn = document.getElementById('debug-report-btn');
    const origOverlayBg = modalOverlay.style.background;
    const origOverlayBackdrop = modalOverlay.style.backdropFilter;
    const origActionDisplay = actionBar.style.display;
    const origShareDisplay = shareDropdown ? shareDropdown.style.display : '';
    const origDebugDisplay = debugBtn ? debugBtn.style.display : '';

    const origContainerStyle = {
        position: reportContainer.style.position,
        top: reportContainer.style.top,
        left: reportContainer.style.left,
        width: reportContainer.style.width,
        height: reportContainer.style.height,
        overflow: reportContainer.style.overflow,
        zIndex: reportContainer.style.zIndex,
        maxHeight: reportContainer.style.maxHeight,
        transform: reportContainer.style.transform
    };

    const svgReplacements = [];
    let origOverflow, origHeight, origMaxHeight;
    try {
        exportBtn.innerHTML = '<span>导出中...</span>';
        exportBtn.disabled = true;
        if (typeof html2canvas === 'undefined') {
            throw new Error('html2canvas 库未加载，请检查网络连接');
        }
        modalOverlay.style.background = 'transparent';
        modalOverlay.style.backdropFilter = 'none';
        actionBar.style.display = 'none';
        if (shareDropdown) shareDropdown.style.display = 'none';
        if (debugBtn) debugBtn.style.display = 'none';

        const svgElements = reportContainer.querySelectorAll('svg');
        for (const svg of svgElements) {
            const rect = svg.getBoundingClientRect();
            const w = Math.max(rect.width, 10) || 300;
            const h = Math.max(rect.height, 10) || 300;
            const clone = svg.cloneNode(true);
            if (!clone.getAttribute('viewBox')) {
                clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
            }
            clone.setAttribute('width', w);
            clone.setAttribute('height', h);
            clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            const svgString = new XMLSerializer().serializeToString(clone);
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            const img = document.createElement('img');
            img.src = url;
            img.style.width = w + 'px';
            img.style.height = h + 'px';
            img.style.display = 'block';
            img.style.visibility = 'visible';
            svgReplacements.push({ svg, img, parent: svg.parentNode, url });
            svg.parentNode.replaceChild(img, svg);
        }
        await new Promise(resolve => setTimeout(resolve, 200));

        const reportBody = document.getElementById('report-body');
        origOverflow = reportBody.style.overflowY;
        origHeight = reportBody.style.height;
        origMaxHeight = reportBody.style.maxHeight;
        reportBody.style.overflowY = 'visible';
        reportBody.style.height = 'auto';
        reportBody.style.maxHeight = 'none';

        reportContainer.style.position = 'absolute';
        reportContainer.style.top = '0';
        reportContainer.style.left = '0';
        reportContainer.style.width = reportContainer.offsetWidth + 'px';
        reportContainer.style.height = 'auto';
        reportContainer.style.overflow = 'visible';
        reportContainer.style.maxHeight = 'none';
        reportContainer.style.zIndex = '99999';
        reportContainer.style.transform = 'none';

        await new Promise(resolve => setTimeout(resolve, 100));

        const totalHeight = reportContainer.scrollHeight;

        const canvas = await html2canvas(reportContainer, {
            backgroundColor: '#1a1a2e',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            windowWidth: reportContainer.offsetWidth,
            windowHeight: totalHeight,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            onclone: function(clonedDoc) {
                const clonedContainer = clonedDoc.getElementById('report-container');
                const clonedReportBody = clonedDoc.getElementById('report-body');
                if (clonedContainer) {
                    clonedContainer.style.background = 'linear-gradient(180deg, #0f0f2a 0%, #1a1a3e 50%, #151530 100%)';
                    clonedContainer.style.position = 'absolute';
                    clonedContainer.style.top = '0';
                    clonedContainer.style.left = '0';
                    clonedContainer.style.width = reportContainer.offsetWidth + 'px';
                    clonedContainer.style.height = 'auto';
                    clonedContainer.style.overflow = 'visible';
                    clonedContainer.style.maxHeight = 'none';
                    clonedContainer.style.transform = 'none';
                }
                if (clonedReportBody) {
                    clonedReportBody.style.overflowY = 'visible';
                    clonedReportBody.style.height = 'auto';
                    clonedReportBody.style.maxHeight = 'none';
                }
            }
        });
        const link = document.createElement('a');
        link.download = `职业成就报告_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('报告已导出为 PNG 图片', 'success');
    } catch (e) {
        console.error('导出失败:', e);
        showToast('导出失败，请重试', 'error');
    } finally {
        for (const { svg, img, url } of svgReplacements) {
            if (img.parentNode) {
                img.parentNode.replaceChild(svg, img);
            }
            URL.revokeObjectURL(url);
        }
        modalOverlay.style.background = origOverlayBg;
        modalOverlay.style.backdropFilter = origOverlayBackdrop;
        actionBar.style.display = origActionDisplay;
        if (shareDropdown) shareDropdown.style.display = origShareDisplay;
        if (debugBtn) debugBtn.style.display = origDebugDisplay;

        reportContainer.style.position = origContainerStyle.position;
        reportContainer.style.top = origContainerStyle.top;
        reportContainer.style.left = origContainerStyle.left;
        reportContainer.style.width = origContainerStyle.width;
        reportContainer.style.height = origContainerStyle.height;
        reportContainer.style.overflow = origContainerStyle.overflow;
        reportContainer.style.zIndex = origContainerStyle.zIndex;
        reportContainer.style.maxHeight = origContainerStyle.maxHeight;
        reportContainer.style.transform = origContainerStyle.transform;

        const reportBody = document.getElementById('report-body');
        if (reportBody) {
            reportBody.style.overflowY = origOverflow;
            reportBody.style.height = origHeight;
            reportBody.style.maxHeight = origMaxHeight;
        }
        exportBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>导出图片</span>';
        exportBtn.disabled = false;
    }
}
function closeReport() {
    document.getElementById('modal-overlay').style.display = 'none';
}
function restartGame() {
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('player-input').value = '';
    hideComment();
    const viewReportBtn = document.getElementById('view-report-btn');
    if (viewReportBtn) {
        viewReportBtn.style.display = 'none';
    }
    window._pendingGameOverData = null;
    clearGameState();
    gameCoins = 1000;
    rechargedCoins = 0;
    lastBackendCoins = 1000;
    updateCoinsDisplay();
    abilities = {
        core_business: 50,
        project_management: 50,
        team_influence: 50,
        strategic_depth: 50
    };
    updateAbilityDisplay('core', 50, 0);
    updateAbilityDisplay('project', 50, 0);
    updateAbilityDisplay('team', 50, 0);
    updateAbilityDisplay('strategy', 50, 0);
    skills = {
        conflict: 'locked',
        eq: 'locked',
        negotiation: 'locked',
        mobilization: 'locked',
        boundary: 'locked',
        public_speaking: 'locked'
    };
    updateSkills(skills);
    currentLevel = 1;
    updateLevel(1);
    levelHistory = [];
    abilitySnapshots = [];
    evaluationScores = [];
    startGame();
}
function showAchievementReport() {
    const reportBtn = document.getElementById('view-report-btn');
    if (reportBtn) {
        reportBtn.style.display = 'none';
    }
    const data = window._pendingGameOverData;
    if (data) {
        showGameOver(data);
        window._pendingGameOverData = null;
    }
}
function activateBurnoutMode() {
    console.log('🔥 激活职业倦怠模式');
    let burnoutWarning = document.getElementById('burnout-warning');
    if (!burnoutWarning) {
        burnoutWarning = document.createElement('div');
        burnoutWarning.id = 'burnout-warning';
        burnoutWarning.className = 'burnout-warning';
        burnoutWarning.innerHTML = `
            <div class="warning-content">
                <span class="warning-icon">⚠️</span>
                <span class="warning-text">大模型调用失败，建议前往"联系管理员"进行修复</span>
            </div>
        `;
        document.querySelector('.container').insertBefore(burnoutWarning, document.querySelector('.container').firstChild);
    }
    document.body.classList.add('burnout-mode');
    const rechargeBtn = document.querySelector('.recharge-card');
    if (rechargeBtn) {
        rechargeBtn.classList.add('pulse-animation');
    }
}
function deactivateBurnoutMode() {
    console.log('✅ 取消职业倦怠模式');
    const burnoutWarning = document.getElementById('burnout-warning');
    if (burnoutWarning) {
        burnoutWarning.remove();
    }
    document.body.classList.remove('burnout-mode');
    const rechargeBtn = document.querySelector('.recharge-card');
    if (rechargeBtn) {
        rechargeBtn.classList.remove('pulse-animation');
    }
}
function activateTestMode() {
    console.log('🧪 测试模式：报告已生成，点击右上角报告按钮查看');
    levelHistory = [
        { level: 1, title: '同事甩锅', icon: '🛡️', comment: '你在会议上冷静地梳理了责任归属，用事实和数据说话，展现了出色的职业素养。', evalScore: 72, abilitiesChange: { core_business: 8, team_influence: 3 }, abilitiesAfter: { core_business: 58, project_management: 50, team_influence: 53, strategic_depth: 50 } },
        { level: 2, title: '紧急任务', icon: '📋', comment: '面对突发任务，你快速排列优先级，展现了良好的时间管理和抗压能力。', evalScore: 78, abilitiesChange: { project_management: 10, core_business: 5 }, abilitiesAfter: { core_business: 63, project_management: 60, team_influence: 53, strategic_depth: 50 } },
        { level: 3, title: '战略视野', icon: '💡', comment: '你对行业趋势的判断精准，提出的战略建议获得了高层的认可，表现出色！', evalScore: 88, abilitiesChange: { strategic_depth: 12, team_influence: 5 }, abilitiesAfter: { core_business: 63, project_management: 60, team_influence: 58, strategic_depth: 62 } },
        { level: 4, title: '跨部门协作', icon: '🔗', comment: '你成功协调了三个部门的资源，项目按期交付，跨部门沟通能力显著提升。', evalScore: 82, abilitiesChange: { team_influence: 10, project_management: 8 }, abilitiesAfter: { core_business: 63, project_management: 68, team_influence: 68, strategic_depth: 62 } },
        { level: 5, title: '客户危机', icon: '🔥', comment: '面对愤怒的客户，你保持了专业和冷静，最终化危机为机遇。', evalScore: 75, abilitiesChange: { core_business: 7, strategic_depth: 5 }, abilitiesAfter: { core_business: 70, project_management: 68, team_influence: 68, strategic_depth: 67 } },
        { level: 6, title: '团队管理', icon: '👨‍💼', comment: '你带领团队在高压下完成了不可能的任务，展现了卓越的领导力和团队凝聚力！', evalScore: 92, abilitiesChange: { team_influence: 12, project_management: 8, core_business: 5 }, abilitiesAfter: { core_business: 75, project_management: 76, team_influence: 80, strategic_depth: 67 } },
        { level: 7, title: '跨职能领导', icon: '🏆', comment: '你成功推动了公司级的战略转型项目，获得了全公司的认可，达到了职业新高度！', evalScore: 95, abilitiesChange: { strategic_depth: 15, core_business: 8, team_influence: 5, project_management: 5 }, abilitiesAfter: { core_business: 83, project_management: 81, team_influence: 85, strategic_depth: 82 } }
    ];
    evaluationScores = levelHistory.map(h => h.evalScore);
    abilitySnapshots = [
        { core_business: 50, project_management: 50, team_influence: 50, strategic_depth: 50 },
        { core_business: 58, project_management: 50, team_influence: 53, strategic_depth: 50 },
        { core_business: 63, project_management: 60, team_influence: 53, strategic_depth: 50 },
        { core_business: 63, project_management: 60, team_influence: 58, strategic_depth: 62 },
        { core_business: 63, project_management: 68, team_influence: 68, strategic_depth: 62 },
        { core_business: 70, project_management: 68, team_influence: 68, strategic_depth: 67 },
        { core_business: 75, project_management: 76, team_influence: 80, strategic_depth: 67 },
        { core_business: 83, project_management: 81, team_influence: 85, strategic_depth: 82 }
    ];
    abilities = { core_business: 83, project_management: 81, team_influence: 85, strategic_depth: 82 };
    currentLevel = 7;
    updateAbilityDisplay('core', 83, 0);
    updateAbilityDisplay('project', 81, 0);
    updateAbilityDisplay('team', 85, 0);
    updateAbilityDisplay('strategy', 82, 0);
    updateLevel(7);
    const mockData = {
        game_over: true,
        ending_title: '职业巅峰达成',
        ending_comment: '恭喜！你已成功完成所有职业挑战，展现了全面的职业能力和领导力素养。',
        current_level: 7,
        evaluation: {
            comment: '这是一段精彩的职业旅程！'
        }
    };
    showGameOver(mockData);
}
function bindReportEvents() {
    const exportBtn = document.getElementById('export-btn');
    const closeBtn = document.getElementById('report-close-btn');
    const restartActionBtn = document.getElementById('restart-action-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportReport);
    if (closeBtn) closeBtn.addEventListener('click', closeReport);
    if (restartActionBtn) restartActionBtn.addEventListener('click', restartGame);
}
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM 加载完成');
    elements = {
        currentLevel: document.getElementById('current-level'),
        challengeLevel: document.getElementById('challenge-level'),
        challengeTitle: document.getElementById('challenge-title'),
        challengeDescription: document.getElementById('challenge-description'),
        commentBox: document.getElementById('comment-box'),
        commentContent: document.getElementById('comment-content'),
        playerInput: document.getElementById('player-input'),
        submitBtn: document.getElementById('submit-btn'),
        coreValue: document.getElementById('core-value'),
        coreChange: document.getElementById('core-change'),
        coreBar: document.getElementById('core-bar'),
        projectValue: document.getElementById('project-value'),
        projectChange: document.getElementById('project-change'),
        projectBar: document.getElementById('project-bar'),
        teamValue: document.getElementById('team-value'),
        teamChange: document.getElementById('team-change'),
        teamBar: document.getElementById('team-bar'),
        strategyValue: document.getElementById('strategy-value'),
        strategyChange: document.getElementById('strategy-change'),
        strategyBar: document.getElementById('strategy-bar'),
        coinsValue: document.getElementById('coins-value'),
        modalOverlay: document.getElementById('modal-overlay'),
        endingTitle: document.getElementById('ending-title'),
        finalLevel: document.getElementById('final-level'),
        finalCore: document.getElementById('final-core'),
        finalProject: document.getElementById('final-project'),
        finalTeam: document.getElementById('final-team'),
        finalStrategy: document.getElementById('final-strategy'),
        endingComment: document.getElementById('ending-comment'),
        restartBtn: document.getElementById('restart-btn')
    };
    console.log('🔍 检查元素是否存在:');
    console.log('  - challenge-title:', elements.challengeTitle);
    console.log('  - challenge-description:', elements.challengeDescription);
    console.log('  - player-input:', elements.playerInput);
    console.log('  - submit-btn:', elements.submitBtn);
    const requiredElements = [
        'challengeTitle', 'challengeDescription', 'commentBox', 'commentContent',
        'playerInput', 'submitBtn', 'coreBar', 'projectBar', 'teamBar', 'strategyBar'
    ];
    let missingElements = [];
    for (const elementName of requiredElements) {
        if (!elements[elementName]) {
            missingElements.push(elementName);
        }
    }
    if (missingElements.length > 0) {
        console.error('❌ 缺少以下元素:', missingElements);
        alert('页面元素加载失败，请检查 HTML 文件');
    } else {
        console.log('✅ 所有元素加载成功');
        elements.submitBtn.addEventListener('click', submitAction);
        elements.playerInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitAction();
            }
        });
        elements.modalOverlay.addEventListener('click', (e) => {
            if (e.target === elements.modalOverlay) {
                closeReport();
            }
        });
        const rechargeOverlay = document.getElementById('recharge-modal-overlay');
        if (rechargeOverlay) {
            rechargeOverlay.addEventListener('click', (e) => {
                if (e.target === rechargeOverlay) {
                    closeRechargeModal();
                }
            });
        }
        bindReportEvents();
        const viewReportBtn = document.getElementById('view-report-btn');
        if (viewReportBtn) {
            viewReportBtn.addEventListener('click', showAchievementReport);
        }
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('test') === 'report') {
            console.log('🧪 检测到测试模式参数 ?test=report');
            setTimeout(() => {
                activateTestMode();
            }, 500);
        } else {
            startGame();
        }
    }
});
function showToast(message, type) {
    const existingToast = document.querySelector('.game-toast');
    if (existingToast) existingToast.remove();
    const toast = document.createElement('div');
    toast.className = `game-toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
        toast.classList.add('toast-show');
    });
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}
function updateCoinsDisplay() {
    const total = gameCoins + rechargedCoins;
    if (elements.coinsValue) {
        elements.coinsValue.textContent = total;
    }
}
function applyBackendCoins(backendCoins) {
    const delta = backendCoins - lastBackendCoins;
    gameCoins = Math.max(0, gameCoins + delta);
    lastBackendCoins = backendCoins;
    updateCoinsDisplay();
    console.log(`💰 后端金币: ${backendCoins} (delta: ${delta >= 0 ? '+' : ''}${delta}), gameCoins: ${gameCoins}, rechargedCoins: ${rechargedCoins}, 显示: ${gameCoins + rechargedCoins}`);
}
function initCoins(backendCoins) {
    gameCoins = backendCoins;
    rechargedCoins = 0;
    lastBackendCoins = backendCoins;
    updateCoinsDisplay();
}
let selectedRecharge = {
    coins: 0,
    price: 0,
    payment: 'wechat'
};
function openRechargeModal() {
    const overlay = document.getElementById('recharge-modal-overlay');
    const coinsDisplay = document.getElementById('recharge-current-coins');
    if (!overlay) return;
    if (coinsDisplay) {
        coinsDisplay.textContent = gameCoins + rechargedCoins;
    }
    selectedRecharge = { coins: 0, price: 0, payment: 'wechat' };
    document.getElementById('recharge-total-price').textContent = '¥0.00';
    document.getElementById('recharge-submit-btn').textContent = '确认支付';
    document.getElementById('recharge-submit-btn').disabled = false;
    document.querySelectorAll('.recharge-amount-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    document.querySelectorAll('.recharge-payment-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    const wechatOpt = document.querySelector('.recharge-payment-option[onclick*="wechat"]');
    if (wechatOpt) wechatOpt.classList.add('selected');
    overlay.style.display = 'flex';
}
function closeRechargeModal() {
    const overlay = document.getElementById('recharge-modal-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    selectedRecharge = { coins: 0, price: 0, payment: 'wechat' };
}
function selectAmount(coinsAmount, price, element) {
    document.querySelectorAll('.recharge-amount-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    element.classList.add('selected');
    selectedRecharge.coins = coinsAmount;
    selectedRecharge.price = price;
    const totalDisplay = document.getElementById('recharge-total-price');
    if (totalDisplay) {
        totalDisplay.textContent = '¥' + price.toFixed(2);
    }
}
function selectPayment(method, element) {
    document.querySelectorAll('.recharge-payment-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    element.classList.add('selected');
    selectedRecharge.payment = method;
}
function submitRecharge() {
    if (selectedRecharge.coins === 0 || selectedRecharge.price === 0) {
        showToast('请先选择充值金额', 'error');
        return;
    }
    if (!selectedRecharge.payment) {
        showToast('请选择支付方式', 'error');
        return;
    }
    const submitBtn = document.getElementById('recharge-submit-btn');
    if (submitBtn) {
        submitBtn.textContent = '正在拉起支付...';
        submitBtn.disabled = true;
    }
    const paymentLabel = selectedRecharge.payment === 'wechat' ? '微信支付' : '支付宝';
    showToast('正在拉起' + paymentLabel + '...', 'info');
    setTimeout(() => {
        rechargedCoins += selectedRecharge.coins;
        updateCoinsDisplay();
        showToast('充值成功！+' + selectedRecharge.coins + ' 金币', 'success');
        if (submitBtn) {
            submitBtn.textContent = '确认支付';
            submitBtn.disabled = false;
        }
        closeRechargeModal();
    }, 1500);
}
window.openRechargeModal = openRechargeModal;
window.closeRechargeModal = closeRechargeModal;
window.selectAmount = selectAmount;
window.selectPayment = selectPayment;
window.submitRecharge = submitRecharge;
window.submitAction = submitAction;

// 全局按钮点击音效
document.addEventListener('click', function(e) {
    const tag = e.target.closest('button, .btn, [onclick]');
    if (tag) {
        SoundFX.play('click');
    }
});

// 导出报告音效单独绑定
document.addEventListener('click', function(e) {
    if (e.target.closest('#export-report-btn') || e.target.closest('#share-report-btn')) {
        SoundFX.play('click');
    }
});