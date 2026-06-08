import json
from typing import Dict, List, Optional, Any
from app.services.llm_service import llm_service


class GameManager:
    """游戏状态管理类 - 职场韧性实战系统"""

    # 通关条件：各关卡的对应核心能力阈值
    PASS_THRESHOLDS = {
        1: ('core_business', 52),
        2: ('project_management', 54),
        3: ('strategic_depth', 56),
        4: ('team_influence', 58),
        5: ('core_business', 60),
        6: ('team_influence', 62),
        7: ('strategic_depth', 65),
    }
    
    def __init__(self):
        self.current_turn: int = 1
        self.current_level: int = 1
        self.consecutive_fails: int = 0  # 当前关卡连续失败次数，用于动态降低阈值
        self.abilities = {
            "core_business": 50,
            "project_management": 50,
            "team_influence": 50,
            "strategic_depth": 50
        }
        self.skills = {
            "conflict": "locked",
            "eq": "locked",
            "negotiation": "locked",
            "mobilization": "locked",
            "boundary": "locked",
            "public_speaking": "locked"
        }
        self.coins: int = 1000
        self.history: List[Dict[str, Any]] = []
        self.current_event: Optional[Dict[str, Any]] = None

    async def reset_game(self, start_level: int = 1) -> Dict[str, Any]:
        """重置游戏，开始新游戏（支持从指定关卡开始）"""
        self.current_turn = start_level
        self.current_level = start_level
        self.abilities = {
            "core_business": 50,
            "project_management": 50,
            "team_influence": 50,
            "strategic_depth": 50
        }
        self.skills = {
            "conflict": "locked",
            "eq": "locked",
            "negotiation": "locked",
            "mobilization": "locked",
            "boundary": "locked",
            "public_speaking": "locked"
        }
        self.coins = 1000
        self.history = []
        self.consecutive_fails = 0

        try:
            first_event = await llm_service.get_next_event(self.current_level)
            if not isinstance(first_event, dict) or 'title' not in first_event:
                raise ValueError("事件格式不正确")
        except Exception as e:
            print(f"初始化事件获取失败: {e}")
            first_event = llm_service._get_default_event(self.current_level)
        
        self.current_event = first_event

        return {
            "current_turn": self.current_turn,
            "current_level": self.current_level,
            "abilities": self.abilities,
            "skills": self.skills,
            "coins": self.coins,
            "current_event": first_event,
            "game_over": False
        }

    async def play_turn(self, player_input: str, current_coins: int | None = None) -> Dict[str, Any]:
        """处理玩家回合"""
        # 前端可能传入了当前金币值（含充值），以同步前后端状态
        if current_coins is not None:
            self.coins = current_coins
            print(f"💰 前端同步金币：{self.coins}")

        # 记录历史
        self.history.append({
            "turn": self.current_turn,
            "level": self.current_level,
            "player_input": player_input,
            "event": self.current_event
        })

        try:
            # 获取评价（传递正确的参数）
            print(f"🎮 处理玩家回合 {self.current_turn}，级别 {self.current_level}")
            print(f"🎤 玩家输入：{player_input[:50]}...")
            print(f"💰 当前积分：{self.coins}")

            # 兜底：如果 current_event 未初始化（如直接加载存档），填充默认事件
            if self.current_event is None:
                print(f"⚠️ current_event 为空，填充兜底事件")
                self.current_event = llm_service._get_default_event(self.current_level)
            
            evaluation = await llm_service.evaluate_player_action(
                situation=self.current_event.get("description", ""),
                player_input=player_input,
                level=self.current_level
            )
            
            print(f"✅ AI 评价成功：comment={evaluation.get('comment', '')}")
            print(f"📈 Coze 原始能力变化：{evaluation.get('abilities_change', {})}")
            
            # 🔥 后处理：校准 Coze 返回的 abilities_change
            # 新策略：Coze prompt 已要求教科书→扣分、硬刚→加分，后端做四道防线
            comment = evaluation.get('comment', '')
            abilities = evaluation.get('abilities_change', {})
            # 兜底评价已由 _determine_ability_change 计算正确值，跳过二次校准
            if evaluation.get('is_fallback'):
                print(f"📈 兜底评价（跳过校准）：{abilities}")
            elif all(v <= 0 for v in abilities.values()) if abilities else False:
                # Coze 全非正分 → 教科书回答，Coze 已正确给扣分，信任
                print(f"📈 Coze 全非正分（教科书回答，跳过校准）：{abilities}")
            elif any(v >= 7 for v in abilities.values()):
                # Coze 高分 + 点评确实含狠毒词 → 信任 Coze；否则走校准防止误判
                harsh_check = any(kw in comment for kw in self._get_harsh_keywords())
                if harsh_check:
                    print(f"📈 Coze 高分+狠毒点评（跳过校准）：{abilities}")
                else:
                    corrected_change = self._calibrate_ability_by_comment(comment)
                    evaluation['abilities_change'] = corrected_change
                    print(f"📈 Coze 高分但点评温和，强制校准：{corrected_change}")
            elif all(v >= 0 for v in abilities.values()) and any(v >= 4 for v in abilities.values()):
                # Coze 温和加分（+4~+6）→ 半硬刚回答，新 prompt 中的合理区间，信任
                print(f"📈 Coze 温和加分（半硬刚回答，跳过校准）：{abilities}")
            else:
                # 可疑区间：0~+3 或正负混合 → 走校准
                corrected_change = self._calibrate_ability_by_comment(comment)
                evaluation['abilities_change'] = corrected_change
                print(f"📈 可疑区间，校准后：{corrected_change}")
            
            # 检查是否为倦怠状态
            if evaluation.get('is_burnout'):
                print(f"🔥 检测到职业倦怠状态！")

            # 更新能力值
            self._update_abilities(evaluation.get("abilities_change", {}))
            
            # 更新技能矩阵
            self._update_skills(evaluation.get("skills_matrix", {}))

            # 根据AI评价动态计算金币奖励
            coin_reward = self._calculate_coin_reward(evaluation.get("abilities_change", {}))
            self.coins = max(0, self.coins + coin_reward)

            # 检查是否通关（达到最后一关）
            if self.current_level >= 7:
                return self._create_game_over_response(evaluation, success=True)

            # 通关条件检查
            passed, ability_key, threshold, current_val = self._check_pass_condition()
            if not passed:
                self.consecutive_fails += 1
                ability_names = {
                    'core_business': '核心业务', 'project_management': '项目管理',
                    'team_influence': '团队协同', 'strategic_depth': '战略思维'
                }
                print(f"⛔ 通关条件不满足：{ability_names.get(ability_key, ability_key)}={current_val} < {threshold}")
                return {
                    "current_turn": self.current_turn,
                    "current_level": self.current_level,
                    "abilities": self.abilities,
                    "skills": self.skills,
                    "coins": self.coins,
                    "evaluation": evaluation,
                    "current_event": self.current_event,
                    "game_over": False,
                    "pass_condition_met": False,
                    "pass_ability_required": ability_key,
                    "pass_threshold": threshold
                }

            # 获取下一个事件
            next_event = await llm_service.get_next_event(self.current_level + 1)
            if not isinstance(next_event, dict) or 'title' not in next_event:
                raise ValueError("事件格式不正确")

            self.current_event = next_event
            self.current_level += 1
            self.current_turn += 1
            self.consecutive_fails = 0  # 通关成功，重置失败计数

            return {
                "current_turn": self.current_turn,
                "current_level": self.current_level,
                "abilities": self.abilities,
                "skills": self.skills,
                "coins": self.coins,
                "evaluation": evaluation,
                "current_event": next_event,
                "game_over": False,
                "pass_condition_met": True,
                "pass_ability_required": "",
                "pass_threshold": 0
            }

        except Exception as e:
            error_msg = str(e)
            print(f"❌ 游戏回合处理失败：{type(e).__name__}: {error_msg}")
            
            # 检测是否为积分耗尽错误
            if "402" in error_msg or "benefit_no_credit" in error_msg:
                print(f"🔥 检测到 Coze API 积分耗尽，触发模拟倦怠模式")
                # 使用倦怠评价数据（传入玩家输入以生成个性化评价）
                burnout_eval = llm_service._get_burnout_evaluation(self.current_level, player_input)
                print(f"DEBUG_BURNOUT_EVALUATION: {json.dumps(burnout_eval, ensure_ascii=False)}")
                
                # 更新能力值（使用倦怠数据 - 负增长）
                self._update_abilities(burnout_eval.get("abilities_change", {}))
                
                # 更新技能矩阵（使用倦怠数据）
                self._update_skills(burnout_eval.get("skills_matrix", {}))
                
                # 不增加金币奖励（模拟积分耗尽）
                print(f"️ 积分耗尽，不增加金币奖励")
                
                evaluation_to_use = burnout_eval
            else:
                print(f"️ 使用动态兜底评价数据")
                # 错误处理 - 使用动态兜底评价（根据玩家输入生成多样化评价）
                fallback_eval = llm_service._get_dynamic_fallback_evaluation(self.current_level, player_input)
                print(f"DEBUG_FALLBACK_EVALUATION: {json.dumps(fallback_eval, ensure_ascii=False)}")
                
                # 更新能力值（使用动态兜底数据）
                self._update_abilities(fallback_eval.get("abilities_change", {}))
                
                # 更新技能矩阵（使用动态兜底数据）
                self._update_skills(fallback_eval.get("skills_matrix", {}))
                
                # 根据AI评价动态计算金币奖励（兜底评价同样按质量计算）
                coin_reward = self._calculate_coin_reward(fallback_eval.get("abilities_change", {}))
                self.coins = max(0, self.coins + coin_reward)
                
                evaluation_to_use = fallback_eval

            # 检查是否通关（达到最后一关）
            if self.current_level >= 7:
                return self._create_game_over_response(evaluation_to_use, success=True)

            # 通关条件检查
            passed, ability_key, threshold, current_val = self._check_pass_condition()
            if not passed:
                self.consecutive_fails += 1
                return {
                    "current_turn": self.current_turn,
                    "current_level": self.current_level,
                    "abilities": self.abilities,
                    "skills": self.skills,
                    "coins": self.coins,
                    "evaluation": evaluation_to_use,
                    "current_event": self.current_event,
                    "game_over": False,
                    "pass_condition_met": False,
                    "pass_ability_required": ability_key,
                    "pass_threshold": threshold
                }
            
            # 获取下一个事件（使用兜底数据）
            next_event = llm_service._get_default_event(self.current_level + 1)
            self.current_event = next_event
            self.current_level += 1
            self.current_turn += 1
            self.consecutive_fails = 0  # 通关成功，重置失败计数

            return {
                "current_turn": self.current_turn,
                "current_level": self.current_level,
                "abilities": self.abilities,
                "skills": self.skills,
                "coins": self.coins,
                "evaluation": evaluation_to_use,
                "current_event": next_event,
                "game_over": False,
                "pass_condition_met": True,
                "pass_ability_required": "",
                "pass_threshold": 0
            }

    # 狠毒关键词——点评越狠毒，能力涨越多
    _HARSH_KEYWORDS = [
        "不堪", "废物", "可笑", "幼稚", "愚蠢", "无能", "丢人", "垃圾",
        "不配", "失败", "没用", "活该", "做梦", "天真", "不知", "完全不懂",
        "令人失望", "毫无", "差劲", "糟糕", "漏洞百出", "自欺欺人",
        "自以为是", "不值一提", "无可救药", "岂有此理", "荒唐",
        "糊弄", "应付", "敷衍", "漏洞", "一塌糊涂", "不敢恭维",
        "自暴自弃", "崩溃", "不堪大用", "扛不住", "退缩",
        "毫无逻辑", "无脑", "甩锅", "推卸", "逃避", "玻璃心"
    ]

    @classmethod
    def _get_harsh_keywords(cls) -> list:
        return cls._HARSH_KEYWORDS

    def _calibrate_ability_by_comment(self, comment: str) -> dict:
        """
        根据点评的狠毒程度校准能力变化。
        核心规则：被骂得越狠能力涨越多，敷衍点评则扣分。
        这个方法是用来强制覆盖 Coze API 返回的不符合规则的 abilities_change。
        """
        comment_lower = comment.lower()
        
        harsh_keywords = self._get_harsh_keywords()
        
        # 敷衍关键词——点评不痛不痒，敷衍了事 → 扣分
        perfunctory_keywords = [
            "不错", "还行", "可以", "差不多", "及格", "中规中矩",
            "尚可", "基本合格", "稳扎稳打", "表现良好", "不错的表现",
            "温吞", "不冷", "不热", "提不起劲", "沟通技巧",
            "继续努力", "加油", "再接再厉"
        ]
        
        # 中等力度——有一定批评但不够狠
        moderate_keywords = [
            "不足", "不够", "缺乏", "需要改进", "有待提高", "还需",
            "不够主动", "不够深入", "不够全面", "有欠缺", "欠缺",
            "没有亮点", "没亮点", "平庸", "普通", "一般般",
            "仅仅是", "仅此而已", "只是", "只能算", "差强人意",
            "没看到", "看不到", "不够清晰", "不够具体"
        ]
        
        harsh_count = sum(1 for kw in harsh_keywords if kw in comment_lower)
        perfunctory_count = sum(1 for kw in perfunctory_keywords if kw in comment_lower)
        moderate_count = sum(1 for kw in moderate_keywords if kw in comment_lower)
        
        print(f"  评论分析: harsh={harsh_count}, moderate={moderate_count}, perfunctory={perfunctory_count}")
        
        # 长文但零狠毒关键词 + 含温和批评词 → Bot 认真写了长篇温和点评（玩家回答无聊），按敷衍扣分
        # 不加 moderate_count 前置条件会误伤 Coze 乱码/胡言乱语的回复
        is_long_but_mild = len(comment) >= 150 and harsh_count == 0 and moderate_count >= 1

        if harsh_count >= 2:
            return {
                "core_business": 8,
                "project_management": 7,
                "team_influence": 6,
                "strategic_depth": 6
            }
        elif harsh_count >= 1:
            return {
                "core_business": 5,
                "project_management": 4,
                "team_influence": 4,
                "strategic_depth": 3
            }
        elif is_long_but_mild:
            return {
                "core_business": -5,
                "project_management": -4,
                "team_influence": -3,
                "strategic_depth": -3
            }
        elif moderate_count >= 2:
            return {
                "core_business": 3,
                "project_management": 2,
                "team_influence": 2,
                "strategic_depth": 2
            }
        elif moderate_count >= 1:
            return {
                "core_business": 1,
                "project_management": 1,
                "team_influence": 1,
                "strategic_depth": 1
            }
        elif perfunctory_count >= 1:
            return {
                "core_business": -5,
                "project_management": -4,
                "team_influence": -3,
                "strategic_depth": -3
            }
        else:
            return {
                "core_business": -2,
                "project_management": -2,
                "team_influence": -1,
                "strategic_depth": -1
            }

    def _check_pass_condition(self) -> tuple:
        """检查是否满足通关条件，返回 (是否通过, 能力key, 阈值, 当前值)
        
        动态阈值 + 硬兜底机制：
        1. 每失败一次阈值-2，最低降至50
        2. 连续失败3次自动放行（避免卡关死循环）
        通关后重置失败计数。
        """
        base_ability_key, base_threshold = self.PASS_THRESHOLDS.get(self.current_level, ('core_business', 0))
        
        # 硬兜底：连续失败3次直接放行
        if self.consecutive_fails >= 3:
            return (True, base_ability_key, 0, self.abilities.get(base_ability_key, 0))
        
        # 动态阈值：每失败一次减2，但不低于50
        dynamic_threshold = max(50, base_threshold - self.consecutive_fails * 2)
        current_val = self.abilities.get(base_ability_key, 0)
        return (current_val >= dynamic_threshold, base_ability_key, dynamic_threshold, current_val)

    def _determine_ending(self) -> dict:
        """根据最终能力值判定结局类型"""
        vals = self.abilities
        avg = sum(vals.values()) / 4
        max_val = max(vals.values())
        min_val = min(vals.values())

        ability_names = {
            'core_business': '核心业务',
            'project_management': '项目管理',
            'team_influence': '团队协同',
            'strategic_depth': '战略思维'
        }

        if all(v >= 70 for v in vals.values()):
            ending_type = '全才型'
            title = '六边形战士'
            description = '你在每一个维度上都展现出了顶级职场人的素养，无论是业务深耕还是战略眼光，都已达到令人仰望的高度。'
        elif max_val >= 80 and min_val < 40:
            ending_type = '偏科型'
            top_ability = max(vals, key=vals.get)
            title = f'{ability_names[top_ability]}专精者'
            description = f'你的{ability_names[top_ability]}能力出类拔萃，但其他维度明显薄弱。职场如木桶，短板决定了你的上限。'
        elif min_val < 35:
            ending_type = '平庸型'
            title = '职场路人'
            description = '你在这次模拟中表现平平，没有突出的优势也没有致命短板——但职场不进则退，平庸是最危险的信号。'
        elif avg >= 55:
            ending_type = '精英型'
            title = '部门中坚'
            description = '你的综合能力稳扎稳打，虽然尚未达到顶尖水平，但已经具备了独当一面的实力，是团队中不可或缺的中坚力量。'
        else:
            ending_type = '均衡型'
            title = '稳步前行者'
            description = '你的各项能力发展均衡，虽无特别突出之处，但也没有明显短板。持续积累，未来可期。'

        return {
            'ending_type': ending_type,
            'ending_title': title,
            'ending_description': description
        }

    def _update_abilities(self, abilities_change: Dict[str, int]) -> None:
        """更新玩家能力值"""
        for key in ["core_business", "project_management", "team_influence", "strategic_depth"]:
            change = abilities_change.get(key, 0)
            self.abilities[key] = max(0, min(100, self.abilities[key] + change))

    def _update_skills(self, skills_matrix: Dict[str, str]) -> None:
        """更新技能矩阵状态"""
        for key in ["conflict", "eq", "negotiation", "mobilization", "boundary", "public_speaking"]:
            if key in skills_matrix:
                self.skills[key] = skills_matrix[key]

    def _calculate_coin_reward(self, abilities_change: Dict[str, int]) -> int:
        """根据AI评价的能力变化动态计算金币奖惩"""
        net_change = sum(abilities_change.values())
        if net_change > 0:
            # 正面评价：能力上升 → 金币奖励
            return 40 + net_change * 5
        elif net_change < 0:
            # 负面评价：能力下降 → 金币扣除
            return -(25 + int(abs(net_change) * 2.5))
        else:
            # 中性评价：保底 +40
            return 40

    def _create_game_over_response(self, evaluation: Dict[str, Any], success: bool = True) -> Dict[str, Any]:
        """创建游戏结束响应"""
        ending = self._determine_ending()
        return {
            "current_turn": self.current_turn,
            "current_level": self.current_level,
            "abilities": self.abilities,
            "skills": self.skills,
            "coins": self.coins,
            "evaluation": evaluation,
            "current_event": None,
            "game_over": True,
            "ending_title": ending['ending_title'],
            "ending_comment": evaluation.get("comment", "恭喜完成所有职业挑战！"),
            "ending_type": ending['ending_type'],
            "ending_description": ending['ending_description']
        }


game_manager = GameManager()