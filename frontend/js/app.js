const API_BASE = 'http://localhost:8000';

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

// 【金币拆分】gameCoins 参与 AI 加减，rechargedCoins 充值保护不受 AI 影响
let gameCoins = 1000;
let rechargedCoins = 0;
let lastBackendCoins = 1000;  // 追踪后端上次返回的金币值，用于计算 delta
let elements = null;

// 关卡历史记录，用于生成报告
let levelHistory = [];
// 记录每个关卡的能力值快照
let abilitySnapshots = [];
// 记录每关的评价（用于判断高光时刻）
let evaluationScores = [];

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
    
    // 确保元素存在
    if (!elements.challengeTitle || !elements.challengeDescription) {
        console.error('❌ 挑战元素不存在');
        return;
    }
    
    elements.challengeTitle.textContent = event.title || '职业挑战';
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

async function startGame() {
    console.log('🚀 启动游戏...');
    
    // 先显示加载状态
    elements.challengeDescription.textContent = '正在加载挑战数据...';
    
    try {
        console.log('📡 正在调用 API:', `${API_BASE}/api/start`);
        
        const response = await fetch(`${API_BASE}/api/start`, {
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
        
        if (data.abilities) {
            abilities = { ...data.abilities };
            updateAbilityDisplay('core', abilities.core_business, 0);
            updateAbilityDisplay('project', abilities.project_management, 0);
            updateAbilityDisplay('team', abilities.team_influence, 0);
            updateAbilityDisplay('strategy', abilities.strategic_depth, 0);
        }
        
        if (data.skills) {
            updateSkills(data.skills);
        }
        
        if (data.current_level) {
            updateLevel(data.current_level);
        }
        
        if (data.current_event) {
            console.log('🎮 准备显示挑战:', data.current_event);
            displayChallenge(data.current_event);
        } else {
            console.error('❌ current_event 为空');
            elements.challengeDescription.textContent = '暂无挑战数据';
        }
        
        if (data.coins !== undefined) {
            initCoins(data.coins);
        }
        
    } catch (error) {
        console.error('❌ 启动游戏失败:', error);
        console.error('❌ 错误详情:', error.stack);
        
        // 尝试使用模拟数据
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
    // 金币为0时阻止提交，引导充值（显示总值 = 游戏金币 + 充值金币）
    if (gameCoins + rechargedCoins <= 0) {
        showToast('职业金币不足，请先前往「充值中心」充值', 'error');
        return;
    }

    const input = elements.playerInput.value.trim();
    
    if (!input) {
        alert('请输入你的策略性回应！');
        return;
    }
    
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
        // 强制打印后端响应数据
        console.log("后端响应数据:", data);
        
        // 处理评价数据
        if (data.evaluation) {
            const evalData = data.evaluation;
            console.log('📊 评价数据:', evalData);
            
            // 【积分耗尽模式】检查是否为倦怠状态
            if (evalData.is_burnout) {
                console.log('🔥 检测到职业倦怠状态！');
                activateBurnoutMode();
            } else {
                // 正常状态，恢复页面样式
                deactivateBurnoutMode();
            }
            
            // 更新能力变化 - 使用强制更新逻辑
            if (evalData.abilities_change) {
                console.log('📈 能力变化:', evalData.abilities_change);
                
                // 更新核心业务能力 - 强制更新，严禁保持为0
                if (evalData.abilities_change.core_business !== undefined) {
                    document.getElementById('core-value').innerText = parseInt(document.getElementById('core-value').innerText) + evalData.abilities_change.core_business;
                    abilities.core_business = parseInt(document.getElementById('core-value').innerText);
                    updateAbilityDisplay('core', abilities.core_business, evalData.abilities_change.core_business);
                }
                
                // 更新项目管理能力 - 强制更新，严禁保持为0
                if (evalData.abilities_change.project_management !== undefined) {
                    document.getElementById('project-value').innerText = parseInt(document.getElementById('project-value').innerText) + evalData.abilities_change.project_management;
                    abilities.project_management = parseInt(document.getElementById('project-value').innerText);
                    updateAbilityDisplay('project', abilities.project_management, evalData.abilities_change.project_management);
                }
                
                // 更新团队影响力 - 强制更新，严禁保持为0
                if (evalData.abilities_change.team_influence !== undefined) {
                    document.getElementById('team-value').innerText = parseInt(document.getElementById('team-value').innerText) + evalData.abilities_change.team_influence;
                    abilities.team_influence = parseInt(document.getElementById('team-value').innerText);
                    updateAbilityDisplay('team', abilities.team_influence, evalData.abilities_change.team_influence);
                }
                
                // 更新战略深度 - 强制更新，严禁保持为0
                if (evalData.abilities_change.strategic_depth !== undefined) {
                    document.getElementById('strategy-value').innerText = parseInt(document.getElementById('strategy-value').innerText) + evalData.abilities_change.strategic_depth;
                    abilities.strategic_depth = parseInt(document.getElementById('strategy-value').innerText);
                    updateAbilityDisplay('strategy', abilities.strategic_depth, evalData.abilities_change.strategic_depth);
                }
            }
            
            // 更新技能矩阵
            if (evalData.skills_matrix) {
                console.log('🎯 技能矩阵更新:', evalData.skills_matrix);
                updateSkills(evalData.skills_matrix);
            }
            
            // 更新点评 - 使用指定ID
            if (evalData.comment) {
                if (document.getElementById('ai-comment')) {
                    document.getElementById('ai-comment').innerText = evalData.comment;
                }
                showComment(evalData.comment);
            }
            
            // 更新关卡 - 使用指定ID
            if (evalData.next_event) {
                if (document.getElementById('event-display')) {
                    document.getElementById('event-display').innerText = evalData.next_event;
                }
            }
        }
        
        // 更新金币（后端现在基于前端传来的值计算，返回的是权威值）
        if (data.coins !== undefined) {
            gameCoins = data.coins;
            rechargedCoins = 0;
            lastBackendCoins = data.coins;
            updateCoinsDisplay();
            console.log(`💰 后端返回金币: ${data.coins}，已同步`);
        }
        
        // 更新能力值（从后端返回的数据中获取最新值）
        if (data.abilities) {
            abilities = { ...data.abilities };
            updateAbilityDisplay('core', abilities.core_business, 0);
            updateAbilityDisplay('project', abilities.project_management, 0);
            updateAbilityDisplay('team', abilities.team_influence, 0);
            updateAbilityDisplay('strategy', abilities.strategic_depth, 0);
        }
        
        // 更新技能矩阵
        if (data.skills) {
            skills = { ...data.skills };
            updateSkills(data.skills);
        }
        
        // 检查游戏是否结束
        if (data.game_over) {
            // 记录最后一关数据，但不立即弹出报告
            recordLevelHistory(data);
            window._pendingGameOverData = data;
            
            // 点评已经在上方显示了，2秒后显示「查看成就报告」按钮
            setTimeout(() => {
                const reportBtn = document.getElementById('view-report-btn');
                if (reportBtn) {
                    reportBtn.style.display = 'block';
                }
            }, 2000);
        } else {
            // 延迟显示新挑战和更新关卡（等待用户看完点评）
            setTimeout(() => {
                hideComment();

                // 【报告追踪】记录当前关卡完成数据
                recordLevelHistory(data);

                // 更新关卡（包括侧边栏高亮）
                if (data.current_level) {
                    updateLevel(data.current_level);
                    
                    // 更新侧边栏高亮
                    const timelineItems = document.querySelectorAll('.timeline-item');
                    timelineItems.forEach(item => {
                        item.classList.remove('active');
                    });
                    const currentItem = document.querySelector(`.timeline-item[data-level="${data.current_level}"]`);
                    if (currentItem) {
                        currentItem.classList.add('active');
                    }
                }
                
                // 显示新挑战
                if (data.current_event) {
                    displayChallenge(data.current_event);
                }
                
                elements.playerInput.value = '';
            }, 10000); // 10秒后更新，让用户有足够时间阅读点评
        }
        
    } catch (error) {
        console.error('❌ 提交回应失败:', error);
        showComment('网络错误，请检查后端服务是否启动');
        elements.playerInput.value = '';
    }
    
    elements.submitBtn.disabled = false;
    elements.submitBtn.textContent = '⚡ 实施职业对策';
}

// ============================================================
// 报告数据追踪
// ============================================================

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

    // 计算正面评价得分（简单启发式：正面词汇加分）
    let evalScore = 50; // 基础分
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

// ============================================================
// 游戏结束 - 展示报告
// ============================================================

function showGameOver(data) {
    // 记录最后一关
    if (levelHistory.length === 0 || levelHistory[levelHistory.length - 1].level !== currentLevel) {
        recordLevelHistory(data);
    }

    // 如果 abilitySnapshots 为空，至少补充初始值
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

    // 填充头部
    document.getElementById('report-player').textContent = '挑战者';
    const now = new Date();
    document.getElementById('report-time').textContent = 
        `${now.getFullYear()}年${String(now.getMonth()+1).padStart(2,'0')}月${String(now.getDate()).padStart(2,'0')}日 ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    document.getElementById('report-total-score').textContent = totalScore;

    // 绘制雷达图
    renderRadarChart();

    // 绘制关卡回顾
    renderLevelReviews();

    // 高光时刻
    renderHighlight();

    // 绘制成长轨迹
    renderGrowthChart();

    // 综合评价
    renderSummary(data, totalScore);

    // 发展建议
    renderSuggestions(totalScore);

    // 显示报告
    document.getElementById('modal-overlay').style.display = 'flex';
}

// ============================================================
// 雷达图（纯 SVG）
// ============================================================

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

    // 背景网格
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

    // 轴线
    let axisHtml = '';
    for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        axisHtml += `<line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
    }

    // 数据多边形
    let dataPoints = '';
    for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
        const vr = (r * values[i]) / 100;
        const px = cx + vr * Math.cos(angle);
        const py = cy + vr * Math.sin(angle);
        dataPoints += `${px},${py} `;
    }

    // 数据点
    let dotsHtml = '';
    for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 / n) * i - Math.PI / 2;
        const vr = (r * values[i]) / 100;
        const px = cx + vr * Math.cos(angle);
        const py = cy + vr * Math.sin(angle);
        dotsHtml += `<circle cx="${px}" cy="${py}" r="4" fill="${colors[i]}" stroke="#fff" stroke-width="1.5"/>`;
    }

    // 标签
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

    // 图例
    const legendDiv = document.getElementById('radar-legend');
    legendDiv.innerHTML = labels.map((label, i) => `
        <div class="radar-legend-item">
            <span class="radar-legend-dot" style="background:${colors[i]}"></span>
            <span>${label}</span>
            <span class="radar-legend-value">${Math.round(values[i])}</span>
        </div>
    `).join('');
}

// ============================================================
// 关卡回顾列表
// ============================================================

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

// ============================================================
// 高光时刻
// ============================================================

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

// ============================================================
// 成长轨迹折线图（纯 SVG）
// ============================================================

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

    // Y轴刻度
    let yGrid = '';
    for (let v = 0; v <= 100; v += 20) {
        const y = pad.top + plotH - (plotH * v / 100);
        yGrid += `<line x1="${pad.left}" y1="${y}" x2="${w - pad.right}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
        yGrid += `<text x="${pad.left - 8}" y="${y}" text-anchor="end" fill="#64748b" font-size="10" dominant-baseline="middle">${v}</text>`;
    }

    // X轴标签
    let xLabels = '';
    const stepX = abilitySnapshots.length > 1 ? plotW / (abilitySnapshots.length - 1) : plotW;
    abilitySnapshots.forEach((_, i) => {
        const x = pad.left + i * stepX;
        xLabels += `<text x="${x}" y="${h - 8}" text-anchor="middle" fill="#64748b" font-size="10">Lv${i+1}</text>`;
    });

    // 折线
    let lines = '';
    keys.forEach((key, ki) => {
        let pathD = '';
        abilitySnapshots.forEach((snap, i) => {
            const x = pad.left + i * stepX;
            const y = pad.top + plotH - (plotH * snap[key] / 100);
            pathD += (i === 0 ? 'M' : 'L') + `${x},${y} `;
        });
        lines += `<path d="${pathD.trim()}" fill="none" stroke="${colors[ki]}" stroke-width="2" stroke-linejoin="round"/>`;

        // 数据点
        abilitySnapshots.forEach((snap, i) => {
            const x = pad.left + i * stepX;
            const y = pad.top + plotH - (plotH * snap[key] / 100);
            lines += `<circle cx="${x}" cy="${y}" r="3" fill="${colors[ki]}"/>`;
            if (i === abilitySnapshots.length - 1) {
                lines += `<text x="${x + 6}" y="${y - 6}" fill="${colors[ki]}" font-size="9">${Math.round(snap[key])}</text>`;
            }
        });
    });

    // 图例
    let legendHtml = '';
    keys.forEach((_, i) => {
        legendHtml += `<rect x="${pad.left + i * 90}" y="${h - 4}" width="10" height="10" rx="2" fill="${colors[i]}"/>`;
        legendHtml += `<text x="${pad.left + i * 90 + 14}" y="${h + 5}" fill="#94a3b8" font-size="10">${labels[i]}</text>`;
    });

    svg.innerHTML = yGrid + xLabels + lines + legendHtml;
}

// ============================================================
// 综合评价 + 建议
// ============================================================

function renderSummary(data, totalScore) {
    let grade, summary;
    if (totalScore >= 85) {
        grade = '卓越';
        summary = '你在所有职业挑战中展现了非凡的领导力和应变能力。你的决策冷静、沟通高效、战略眼光独到，已经完全具备高级管理者的素养。';
    } else if (totalScore >= 70) {
        grade = '优秀';
        summary = '你成功应对了大部分职业挑战，展现了扎实的业务功底和良好的团队协作能力。在某些关键时刻决策上还有提升空间。';
    } else if (totalScore >= 55) {
        grade = '良好';
        summary = '你基本完成了挑战，在基础业务和团队沟通方面表现尚可，但在复杂局面下的战略决策和压力管理方面需要加强。';
    } else {
        grade = '成长中';
        summary = '你在挑战中遇到了一些困难，这也是职业成长的必经之路。建议多积累实战经验，提升关键时刻的决策力和情绪管理能力。';
    }

    document.getElementById('report-summary').innerHTML = `
        <strong style="color:#fbbf24;font-size:1.1rem;">评级：${grade}</strong><br><br>
        ${summary}<br><br>
        最终达到 Level ${currentLevel}，综合能力评分 <strong style="color:#fbbf24;">${totalScore}</strong> / 100。
    `;
}

function renderSuggestions(totalScore) {
    let suggestions = [];
    const ab = abilities;

    if (ab.core_business < 60) suggestions.push('加强核心业务能力的深度钻研，多参与实际项目积累经验。');
    if (ab.project_management < 60) suggestions.push('提升项目管理能力，学习使用甘特图、看板等工具规划工作。');
    if (ab.team_influence < 60) suggestions.push('增强团队协同影响力，主动承担团队协调角色，多倾听他人意见。');
    if (ab.strategic_depth < 60) suggestions.push('培养战略思维深度，多阅读行业报告，从宏观视角审视问题。');

    if (suggestions.length === 0) {
        suggestions.push('你已经全面均衡发展，建议选择一个方向做更深层次的专精突破。');
        suggestions.push('可以尝试承担更大规模的跨部门项目，锻炼综合领导力。');
    }
    suggestions.push('保持反思习惯，每次重要决策后记录思考过程，持续迭代优化。');

    document.getElementById('report-suggestions').innerHTML = 
        suggestions.map((s, i) => `<div style="margin-bottom:8px;">${i+1}. ${s}</div>`).join('');
}

// ============================================================
// 导出报告（纯 JS - SVG foreignObject 方案）
// ============================================================

async function exportReport() {
    const reportBody = document.getElementById('report-body');
    const actionBar = document.querySelector('.report-action-bar');
    const exportBtn = document.getElementById('export-btn');

    try {
        exportBtn.innerHTML = '<span>导出中...</span>';
        exportBtn.disabled = true;

        // 暂时隐藏操作按钮栏以避免出现在截图中
        const origDisplay = actionBar.style.display;
        actionBar.style.display = 'none';

        // 克隆报告内容
        const clone = reportBody.cloneNode(true);
        clone.style.width = '800px';
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.top = '0';
        clone.style.backgroundColor = '#0f0f2a';
        clone.style.padding = '30px 35px';
        document.body.appendChild(clone);

        // 使用 html2canvas 风格的方式：创建 SVG foreignObject
        const htmlContent = new XMLSerializer().serializeToString(clone);
        const blob = new Blob([`
            <svg xmlns="http://www.w3.org/2000/svg" width="800" height="${clone.offsetHeight}">
                <foreignObject width="800" height="${clone.offsetHeight}">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="
                        background: linear-gradient(180deg, #0f0f2a 0%, #1a1a3e 50%, #151530 100%);
                        color: #e0e0e0;
                        font-family: 'ZCOOL KuaiLe', 'Ma Shan Zheng', cursive, sans-serif;
                        padding: 30px 35px;
                    ">
                        ${htmlContent.replace(/<script[\s\S]*?<\/script>/g, '')}
                    </div>
                </foreignObject>
            </svg>
        `], { type: 'image/svg+xml;charset=utf-8' });

        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = clone.offsetHeight;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#0f0f2a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            canvas.toBlob(function(pngBlob) {
                const downloadUrl = URL.createObjectURL(pngBlob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `职业成就报告_${new Date().toISOString().slice(0,10)}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(downloadUrl);

                showToast('报告已导出为 PNG 图片', 'success');
                exportBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>导出图片</span>';
                exportBtn.disabled = false;
            }, 'image/png');
        };

        img.onerror = function() {
            // 降级方案：导出为 HTML 文件
            fallbackExportHTML(clone, exportBtn);
        };

        img.src = url;

        // 清理
        document.body.removeChild(clone);
        actionBar.style.display = origDisplay;

    } catch (e) {
        console.error('导出失败:', e);
        showToast('导出失败，已尝试降级方案', 'error');
        const exportBtn2 = document.getElementById('export-btn');
        exportBtn2.innerHTML = '<span>导出图片</span>';
        exportBtn2.disabled = false;
    }
}

function fallbackExportHTML(clone, exportBtn) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>职业成就报告</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&display=swap');
    body { background:#0f0f2a; color:#e0e0e0; font-family:'ZCOOL KuaiLe',cursive,sans-serif; max-width:800px; margin:0 auto; padding:30px; }
    ${document.querySelector('style').textContent}
</style></head>
<body>${clone.innerHTML}</body></html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `职业成就报告_${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('已导出为 HTML 文件（降级方案）', 'info');
    exportBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>导出图片</span>';
    exportBtn.disabled = false;
}

// ============================================================
// 分享功能
// ============================================================

function showSharePopup() {
    const dropdown = document.getElementById('share-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

function closeSharePopup() {
    const dropdown = document.getElementById('share-dropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
}

function copyReportText() {
    let text = '=== 职业成就报告 ===\n\n';
    text += `综合评分：${document.getElementById('report-total-score').textContent} / 100\n`;
    text += `完成时间：${document.getElementById('report-time').textContent}\n\n`;

    text += '【能力值】\n';
    text += `核心业务能力：${Math.round(abilities.core_business)}\n`;
    text += `项目管理矩阵：${Math.round(abilities.project_management)}\n`;
    text += `团队协同影响力：${Math.round(abilities.team_influence)}\n`;
    text += `战略思维深度：${Math.round(abilities.strategic_depth)}\n\n`;

    text += '【关卡回顾】\n';
    levelHistory.forEach(h => {
        text += `Lv${h.level} ${h.title}：${h.comment || '完成挑战'}\n`;
    });

    text += '\n【综合评价】\n';
    text += document.getElementById('report-summary').textContent.trim() + '\n';

    navigator.clipboard.writeText(text).then(() => {
        showToast('报告文本已复制到剪贴板', 'success');
        closeSharePopup();
    }).catch(() => {
        showToast('复制失败，请重试', 'error');
    });
}

function copyShareLink() {
    const fakeLink = `https://job-madness.app/report/${Date.now().toString(36)}`;
    navigator.clipboard.writeText(fakeLink).then(() => {
        showToast('链接已复制（模拟分享链接）', 'success');
        closeSharePopup();
    }).catch(() => {
        showToast('复制失败，请重试', 'error');
    });
}

// ============================================================
// 关闭报告
// ============================================================

function closeReport() {
    document.getElementById('modal-overlay').style.display = 'none';
}

// ============================================================
// 重新开始
// ============================================================

function restartGame() {
    // 关闭报告弹窗
    document.getElementById('modal-overlay').style.display = 'none';
    // 清空输入框
    document.getElementById('player-input').value = '';
    // 隐藏点评
    hideComment();
    
    // 隐藏「查看成就报告」按钮
    const viewReportBtn = document.getElementById('view-report-btn');
    if (viewReportBtn) {
        viewReportBtn.style.display = 'none';
    }
    
    // 清除待处理的报告数据
    window._pendingGameOverData = null;
    
    // 重置金币为初始值
    gameCoins = 1000;
    rechargedCoins = 0;
    lastBackendCoins = 1000;
    updateCoinsDisplay();
    
    // 重置能力值为初始值并同步 UI
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
    
    // 重置技能矩阵并同步 UI
    skills = {
        conflict: 'locked',
        eq: 'locked',
        negotiation: 'locked',
        mobilization: 'locked',
        boundary: 'locked',
        public_speaking: 'locked'
    };
    updateSkills(skills);
    
    // 重置当前关卡为 Level 1 并同步 UI
    currentLevel = 1;
    updateLevel(1);

    // 重置报告追踪数据
    levelHistory = [];
    abilitySnapshots = [];
    evaluationScores = [];
    
    startGame();
}

// ============================================================
// 查看成就报告（通关后手动触发）
// ============================================================

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

// 【大模型调用失败】激活倦怠状态
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

// ============================================================
// 测试模式：?test=report
// ============================================================

function activateTestMode() {
    console.log('🧪 测试模式：报告已生成，点击右上角报告按钮查看');

    // 模拟关卡历史数据
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

    // 更新当前能力值
    abilities = { core_business: 83, project_management: 81, team_influence: 85, strategic_depth: 82 };
    currentLevel = 7;
    updateAbilityDisplay('core', 83, 0);
    updateAbilityDisplay('project', 81, 0);
    updateAbilityDisplay('team', 85, 0);
    updateAbilityDisplay('strategy', 82, 0);
    updateLevel(7);

    // 模拟 data 格式调 showGameOver
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

// ============================================================
// 绑定报告相关事件
// ============================================================

function bindReportEvents() {
    const exportBtn = document.getElementById('export-btn');
    const shareBtn = document.getElementById('share-btn');
    const closeBtn = document.getElementById('report-close-btn');
    const restartActionBtn = document.getElementById('restart-action-btn');
    const shareCopyBtn = document.getElementById('share-copy-btn');
    const shareLinkBtn = document.getElementById('share-link-btn');
    const shareDropdown = document.getElementById('share-dropdown');

    if (exportBtn) exportBtn.addEventListener('click', exportReport);
    if (shareBtn) {
        shareBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            showSharePopup();
        });
    }
    if (closeBtn) closeBtn.addEventListener('click', closeReport);
    if (restartActionBtn) restartActionBtn.addEventListener('click', restartGame);
    if (shareCopyBtn) shareCopyBtn.addEventListener('click', copyReportText);
    if (shareLinkBtn) shareLinkBtn.addEventListener('click', copyShareLink);

    // 点击报告弹窗内其他地方关闭分享下拉
    document.addEventListener('click', function(e) {
        if (shareDropdown && shareDropdown.classList.contains('active')) {
            const wrapper = document.getElementById('share-btn-wrapper');
            if (wrapper && !wrapper.contains(e.target)) {
                closeSharePopup();
            }
        }
    });
}

// 页面加载完成
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM 加载完成');
    
    // 初始化 elements 对象（必须在 DOM 加载完成后）
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
    
    // 检查所有必需元素
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
        
        // 添加事件监听器
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
        
        // 充值弹窗遮罩层点击关闭
        const rechargeOverlay = document.getElementById('recharge-modal-overlay');
        if (rechargeOverlay) {
            rechargeOverlay.addEventListener('click', (e) => {
                if (e.target === rechargeOverlay) {
                    closeRechargeModal();
                }
            });
        }

        // 绑定报告相关事件
        bindReportEvents();

        // 绑定查看成就报告按钮
        const viewReportBtn = document.getElementById('view-report-btn');
        if (viewReportBtn) {
            viewReportBtn.addEventListener('click', showAchievementReport);
        }

        // 测试模式检测
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('test') === 'report') {
            console.log('🧪 检测到测试模式参数 ?test=report');
            // 延迟执行，确保所有初始化完成
            setTimeout(() => {
                activateTestMode();
            }, 500);
        } else {
            startGame();
        }
    }
});

// ============================================================
// 加速器购买系统
// ============================================================

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

// 更新金币显示（显示总值 = 游戏金币 + 充值金币）
function updateCoinsDisplay() {
    const total = gameCoins + rechargedCoins;
    if (elements.coinsValue) {
        elements.coinsValue.textContent = total;
    }
}

// 【兼容旧调用】后端返回金币时：计算 delta 只应用到 gameCoins，保护 rechargedCoins
function applyBackendCoins(backendCoins) {
    const delta = backendCoins - lastBackendCoins;
    gameCoins = Math.max(0, gameCoins + delta);
    lastBackendCoins = backendCoins;
    updateCoinsDisplay();
    console.log(`💰 后端金币: ${backendCoins} (delta: ${delta >= 0 ? '+' : ''}${delta}), gameCoins: ${gameCoins}, rechargedCoins: ${rechargedCoins}, 显示: ${gameCoins + rechargedCoins}`);
}

// 初始化金币（游戏开始时调用）
function initCoins(backendCoins) {
    gameCoins = backendCoins;
    rechargedCoins = 0;
    lastBackendCoins = backendCoins;
    updateCoinsDisplay();
}

// ============================================================
// 充值系统
// ============================================================

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

// 确保核心函数挂载到 window 对象，使 HTML onclick 属性能访问
window.openRechargeModal = openRechargeModal;
window.closeRechargeModal = closeRechargeModal;
window.selectAmount = selectAmount;
window.selectPayment = selectPayment;
window.submitRecharge = submitRecharge;
window.submitAction = submitAction;