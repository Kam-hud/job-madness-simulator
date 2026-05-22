import json
from typing import Dict, List, Optional, Any
from app.services.llm_service import llm_service


class GameManager:
    """游戏状态管理类 - 职场韧性实战系统"""
    
    def __init__(self):
        self.current_turn: int = 1
        self.current_level: int = 1
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

    async def reset_game(self) -> Dict[str, Any]:
        """重置游戏，开始新游戏"""
        self.current_turn = 1
        self.current_level = 1
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

    async def play_turn(self, player_input: str) -> Dict[str, Any]:
        """处理玩家回合"""
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
            
            evaluation = await llm_service.evaluate_player_action(
                situation=self.current_event.get("description", ""),
                player_input=player_input,
                level=self.current_level
            )
            
            print(f"✅ AI 评价成功：comment={evaluation.get('comment', '')}")
            print(f"📈 能力变化：{evaluation.get('abilities_change', {})}")
            
            # 检查是否为倦怠状态
            if evaluation.get('is_burnout'):
                print(f"🔥 检测到职业倦怠状态！")

            # 更新能力值
            self._update_abilities(evaluation.get("abilities_change", {}))
            
            # 更新技能矩阵
            self._update_skills(evaluation.get("skills_matrix", {}))

            # 增加金币奖励
            self.coins += 100

            # 检查是否通关
            if self.current_level >= 7:
                return self._create_game_over_response(evaluation, success=True)

            # 获取下一个事件
            next_event = await llm_service.get_next_event(self.current_level + 1)
            if not isinstance(next_event, dict) or 'title' not in next_event:
                raise ValueError("事件格式不正确")

            self.current_event = next_event
            self.current_level += 1
            self.current_turn += 1

            return {
                "current_turn": self.current_turn,
                "current_level": self.current_level,
                "abilities": self.abilities,
                "skills": self.skills,
                "coins": self.coins,
                "evaluation": evaluation,
                "current_event": next_event,
                "game_over": False
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
                
                # 增加金币奖励
                self.coins += 100
                
                evaluation_to_use = fallback_eval

            # 检查是否通关
            if self.current_level >= 7:
                return self._create_game_over_response(evaluation_to_use, success=True)
            
            # 获取下一个事件（使用兜底数据）
            next_event = llm_service._get_default_event(self.current_level + 1)
            self.current_event = next_event
            self.current_level += 1
            self.current_turn += 1

            return {
                "current_turn": self.current_turn,
                "current_level": self.current_level,
                "abilities": self.abilities,
                "skills": self.skills,
                "coins": self.coins,
                "evaluation": evaluation_to_use,
                "current_event": next_event,
                "game_over": False
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

    def _create_game_over_response(self, evaluation: Dict[str, Any], success: bool = True) -> Dict[str, Any]:
        """创建游戏结束响应"""
        return {
            "current_turn": self.current_turn,
            "current_level": self.current_level,
            "abilities": self.abilities,
            "skills": self.skills,
            "coins": self.coins,
            "evaluation": evaluation,
            "current_event": None,
            "game_over": True,
            "ending_title": "🏆 职业巅峰达成！" if success else "游戏结束",
            "ending_comment": evaluation.get("comment", "恭喜完成所有职业挑战！")
        }


game_manager = GameManager()