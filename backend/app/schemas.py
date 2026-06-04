from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class GameStatus(str, Enum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    ENDED = "ended"


class PlayerStatus(BaseModel):
    sanity: int = Field(default=100, ge=0, le=100, description="精神值 0-100")
    money: int = Field(default=5000, ge=0, description="存款金额")
    reputation: int = Field(default=50, ge=0, le=100, description="职场口碑 0-100")
    round: int = Field(default=0, ge=0, description="当前回合数")


class GameEvent(BaseModel):
    event_id: str = Field(description="事件唯一ID")
    title: str = Field(description="事件标题")
    description: str = Field(description="事件描述")
    options: List[str] = Field(description="玩家可选的回复选项")
    difficulty: int = Field(default=1, ge=1, le=5, description="难度等级")


class EvaluationResult(BaseModel):
    sanity_change: int = Field(description="精神值变化，正数增加，负数减少")
    money_change: int = Field(description="金钱变化，正数增加，负数减少")
    reputation_change: int = Field(description="口碑变化，正数增加，负数减少")
    survival_days: int = Field(description="存活天数")
    is_game_over: bool = Field(default=False, description="是否游戏结束")
    comment: str = Field(description="AI毒舌评价")


class GameSession(BaseModel):
    session_id: str
    status: GameStatus = GameStatus.WAITING
    player_status: PlayerStatus = Field(default_factory=PlayerStatus)
    current_event: Optional[GameEvent] = None


class StartGameRequest(BaseModel):
    player_name: str = Field(default="打工人", description="玩家名字")


class SubmitReplyRequest(BaseModel):
    session_id: str
    reply: str = Field(description="玩家回复内容")
    selected_option: Optional[int] = Field(default=None, description="选择的选项索引")


class SubmitReplyResponse(BaseModel):
    result: EvaluationResult
    next_event: Optional[GameEvent] = None
    game_over: bool = False
    final_score: Optional[int] = None
    pass_condition_met: bool = True
    pass_ability_required: str = ""
    pass_threshold: int = 0
    ending_type: str = ""
    ending_title: str = ""
    ending_description: str = ""
