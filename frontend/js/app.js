const API_BASE = '';

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

let elements = null;

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
            elements.coinsValue.textContent = data.coins;
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
        elements.coinsValue.textContent = mockData.coins;
        
        elements.challengeDescription.textContent = '(使用模拟数据) ' + mockData.current_event.description;
    }
}

async function submitAction() {
    const input = elements.playerInput.value.trim();
    
    if (!input) {
        alert('请输入你的策略性回应！');
        return;
    }
    
    elements.submitBtn.disabled = true;
    elements.submitBtn.textContent = '策略实施中...';
    
    try {
        const response = await fetch(`${API_BASE}/api/action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                player_input: input
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
        
        // 更新金币
        if (data.coins !== undefined) {
            elements.coinsValue.textContent = data.coins;
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
            showGameOver(data);
        } else {
            // 更新关卡
            if (data.current_level) {
                updateLevel(data.current_level);
            }
            
            // 延迟显示新挑战
            setTimeout(() => {
                hideComment();
                if (data.current_event) {
                    displayChallenge(data.current_event);
                }
                elements.playerInput.value = '';
            }, 2500);
        }
        
    } catch (error) {
        console.error('❌ 提交回应失败:', error);
        showComment('网络错误，请检查后端服务是否启动');
        elements.playerInput.value = '';
    }
    
    elements.submitBtn.disabled = false;
    elements.submitBtn.textContent = '⚡ 实施职业对策';
}

function showGameOver(data) {
    elements.endingTitle.textContent = data.ending_title || '职业成就达成';
    elements.finalLevel.textContent = `Level ${data.current_level || currentLevel}`;
    elements.finalCore.textContent = Math.round(abilities.core_business);
    elements.finalProject.textContent = Math.round(abilities.project_management);
    elements.finalTeam.textContent = Math.round(abilities.team_influence);
    elements.finalStrategy.textContent = Math.round(abilities.strategic_depth);
    
    let finalComment = data.ending_comment || '恭喜完成所有职业挑战！';
    if (data.evaluation && data.evaluation.comment) {
        finalComment = data.evaluation.comment;
    }
    elements.endingComment.textContent = finalComment;
    
    elements.modalOverlay.style.display = 'flex';
}

function restartGame() {
    elements.modalOverlay.style.display = 'none';
    elements.playerInput.value = '';
    hideComment();
    
    abilities = {
        core_business: 50,
        project_management: 50,
        team_influence: 50,
        strategic_depth: 50
    };
    
    skills = {
        conflict: 'locked',
        eq: 'locked',
        negotiation: 'locked',
        mobilization: 'locked',
        boundary: 'locked',
        public_speaking: 'locked'
    };
    
    startGame();
}

// 【积分耗尽模式】激活倦怠状态
function activateBurnoutMode() {
    console.log('🔥 激活职业倦怠模式');
    
    // 在顶部显示警告提示
    let burnoutWarning = document.getElementById('burnout-warning');
    if (!burnoutWarning) {
        burnoutWarning = document.createElement('div');
        burnoutWarning.id = 'burnout-warning';
        burnoutWarning.className = 'burnout-warning';
        burnoutWarning.innerHTML = `
            <div class="warning-content">
                <span class="warning-icon">⚠️</span>
                <span class="warning-text">当前职业动能不足，建议前往"职业资产包"获取加速器</span>
            </div>
        `;
        document.querySelector('.container').insertBefore(burnoutWarning, document.querySelector('.container').firstChild);
    }
    
    // 添加灰暗风格 class 到 body
    document.body.classList.add('burnout-mode');
    
    // 让购买按钮闪烁
    const purchaseBtn = document.querySelector('.purchase-btn');
    if (purchaseBtn) {
        purchaseBtn.classList.add('pulse-animation');
    }
}

// 【积分耗尽模式】取消倦怠状态
function deactivateBurnoutMode() {
    console.log('✅ 取消职业倦怠模式');
    
    // 移除警告提示
    const burnoutWarning = document.getElementById('burnout-warning');
    if (burnoutWarning) {
        burnoutWarning.remove();
    }
    
    // 移除灰暗风格 class
    document.body.classList.remove('burnout-mode');
    
    // 移除购买按钮闪烁效果
    const purchaseBtn = document.querySelector('.purchase-btn');
    if (purchaseBtn) {
        purchaseBtn.classList.remove('pulse-animation');
    }
}

// 页面加载完成后启动游戏
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
        
        elements.restartBtn.addEventListener('click', restartGame);
        
        elements.modalOverlay.addEventListener('click', (e) => {
            if (e.target === elements.modalOverlay) {
                restartGame();
            }
        });
        
        startGame();
    }
});