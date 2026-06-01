import json
import asyncio
import uuid
import httpx
import random
from typing import Dict, Any, Optional
from app.config import settings


class LLMService:
    """扣子API服务封装类 - 职场韧性实战系统"""
    
    def __init__(self):
        self.coze_api_key = settings.COZE_API_KEY
        self.coze_url = settings.COZE_URL
        self.coze_bot_id = settings.COZE_BOT_ID
        self._http_client = httpx.AsyncClient(
            timeout=30.0,
            limits=httpx.Limits(max_connections=10)
        )
        
        # 职业倦怠评价列表（积分耗尽时使用）
        self.burnout_comments = [
            "由于缺乏持续输入，你已进入职业倦怠期。",
            "你需要通过积累专业资产来重新激活职业动力。",
            "职业动能不足，建议暂时休息调整状态。",
            "持续的职业疲劳正在侵蚀你的核心竞争力。",
            "没有新的能量输入，你的职业能力正在退化。",
            "职场如逆水行舟，不进则退。现在是时候重新充电了。",
            "你的职业引擎已经熄火，需要添加新的燃料。",
            "缺乏成长动力的你，正在被职场后浪超越。",
            "职业发展陷入停滞，需要寻找新的突破点。",
            "长期高压工作导致效率下降，建议调整工作节奏。",
            "创新能力正在衰退，需要注入新的思维方式。",
            "团队协作热情降低，人际关系逐渐疏远。"
        ]
        
        # 狠毒评价列表（根据玩家输入动态选择）
        self.positive_comments = [
            "这次的表现勉强及格，别得意，你的职场生涯才刚刚开始。",
            "处理问题的方式还算过关，但别忘了山外有山，人外有人。",
            "你的应对策略虽然有效，但也暴露了你缺乏系统性思维。",
            "不错，但这只是基本操作，高手从不炫耀这些小成绩。",
            "你的专业能力有所展现，但这离真正的职场精英还差得远。",
            "能够冷静处理问题，说明你还有点脑子，但还需要更多历练。",
            "这次危机处理得当，不过别忘了居安思危，下次未必这么幸运。",
            "你的沟通技巧救了这场危机，但光靠嘴皮子可走不长远。",
            "决策果断值得肯定，但希望你明白，职场如战场，一步错步步错。",
            "团队协作不错，但作为领导者的你，还需要更多智慧和魄力。",
            "处理方式有新意，但执行层面还有明显短板需要弥补。",
            "你的思路清晰，但落地能力还需要在实战中检验。",
            "危机中表现出的冷静值得肯定，但这只是职场大考的第一步。",
            "你找到了问题的症结，但解决方案的可行性还需要验证。",
            "沟通表达有条理，不过说服力和影响力还需要加强。"
        ]
        
        # 中性评价列表（更狠毒的版本）
        self.neutral_comments = [
            "你的表现就像一杯温吞水，不冷不热，让人提不起劲。",
            "这种敷衍了事的态度，在职场早晚会吃亏的。",
            "你的能力配不上你的野心，还是先认清现实吧。",
            "处理问题的方式太平庸了，难怪升职加薪轮不到你。",
            "你的表现只能说是及格线，离优秀还差十万八千里。",
            "别以为不出错就算成功了，在职场不进则退是铁律。",
            "你的反应速度太慢了，职场机会稍纵即逝，你抓不住。",
            "沟通能力有待提高，别总是说不到点子上。",
            "决策时犹豫不决，这种性格在职场很难有作为。",
            "团队协作能力一般，你的存在感太低了。",
            "战略思维严重缺乏，只看眼前不看长远，迟早要栽跟头。",
            "抗压能力堪忧，遇到点压力就崩溃，这样的人不堪大用。",
            "学习态度还行，但光有态度没有能力，也是白搭。",
            "你的表现让我想起了'混日子'这三个字。",
            "职场不相信眼泪，也不相信借口，只看结果。",
            "你的方案听起来不错，但实际执行恐怕困难重重。",
            "处理问题的方式有点意思，但效果还需要观察。",
            "你没有犯大错，但这不意味着你做对了什么。",
            "你的思路有点混乱，建议先理清逻辑再开口。",
            "和同事相处还行，但离真正的团队领袖还差得远。",
            "你对问题的理解不够深入，只停留在表面。",
            "你的建议有一定道理，但可行性需要打个问号。",
            "没有亮点也没有失误，这种状态在职场很危险。",
            "你以为自己做得不错，但实际上只是在应付。",
            "态度端正但方法错误南辕北辙。",
            "你对职场规则的理解还停留在教科书层面。"
        ]
        
        # 负面评价列表（更狠毒的版本）
        self.negative_comments = [
            "你的表现简直是一场职场灾难，让我怀疑你是否真的适合职场。",
            "这种低级的错误都能犯，我看你的职业素养需要回炉重造。",
            "你的应对方式暴露了严重的职场短板，简直让人无语。",
            "遇到问题就推卸责任，这种甩锅侠在职场走不远的。",
            "你的沟通能力简直灾难，和你说话简直是浪费时间。",
            "决策能力为零，你的每一次决定都在把团队往坑里带。",
            "团队协作能力负分滚粗，没有人愿意和这样的人合作。",
            "效率低到令人发指，你的一天工作量还不如别人一小时。",
            "工作态度极其敷衍，你的职业道德需要重新培训。",
            "情绪控制能力为零，动不动就崩溃，这样的人怎么扛事？",
            "战略眼光完全缺失，只能看到鼻子尖那么远，没有前途。",
            "人际关系一塌糊涂，和谁都处不好，活该被孤立。",
            "你的表现让我怀疑你是来职场体验生活的，不是来工作的。",
            "遇到压力就逃避，你以为职场是过家家吗？",
            "你的综合能力评估：不合格，建议重新学习职场生存法则。",
            "你的方案简直是空中楼阁，完全不接地气。",
            "你处理问题的思路完全错误，越努力越糟糕。",
            "你职场情商为零，和你合作简直是噩梦。",
            "你引以为傲的成绩，在别人眼里不过是基本要求。",
            "你的视野太窄，只看到自己的一亩三分地。",
            "你所谓的'经验'，不过是重复犯同样的错误。",
            "你不善于总结教训，同样的坑会反复掉进去。",
            "你的学习能力堪忧，别人教一遍就会，你需要十遍。",
            "你缺乏主动思考，只会等待指令行事。",
            "你的野心和你的能力之间存在巨大鸿沟。",
            "你在职场中的存在感约等于零，可有可无。",
            "你的领导力评分：负分，团队跟着你只有倒霉。"
        ]

    def _clean_json_output(self, text: str) -> str:
        """清理可能包含的 markdown 代码块标记"""
        # 先执行 strip() 清洗
        text = text.strip()
        
        # 清理 markdown 代码块标记
        if text.startswith('```json'):
            text = text[7:]
            print("🔍 移除了开头的 ```json 标记")
        elif text.startswith('```'):
            text = text[3:]
            print("🔍 移除了开头的 ``` 标记")
        
        if text.endswith('```'):
            text = text[:-3]
            print("🔍 移除了结尾的 ``` 标记")
        
        # 再次 strip 确保干净
        result = text.strip()
        print(f"📝 清洗后的文本: {result[:100]}...")
        return result

    def _parse_stream_response(self, response_text: str) -> Optional[str]:
        """解析流式响应，提取大模型返回的内容"""
        full_content = []
        
        # SSE格式解析：event: xxx\ndata: {...}
        lines = response_text.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if line.startswith('data: '):
                try:
                    data = json.loads(line[5:])
                    if isinstance(data, dict):
                        # 处理 SSE message 格式
                        if 'content' in data:
                            content = data['content']
                            if isinstance(content, dict):
                                if 'answer' in content and content['answer'] is not None:
                                    full_content.append(str(content['answer']))
                                elif 'type' in content and content['type'] == 'answer' and 'content' in content:
                                    full_content.append(str(content['content']))
                            else:
                                full_content.append(str(content))
                        elif 'type' in data and data['type'] == 'answer' and 'content' in data:
                            full_content.append(str(data['content']))
                        elif 'answer' in data and data['answer'] is not None:
                            full_content.append(str(data['answer']))
                except json.JSONDecodeError:
                    continue
        
        # 如果标准解析没有结果，尝试正则提取所有answer字段值
        if not full_content:
            import re
            # 匹配 '"answer": "xxx"' 或 '"answer": \'xxx\'' 模式
            matches = re.findall(r'"answer"\s*:\s*["\']([^"\']*)["\']', response_text)
            if matches:
                full_content.extend(matches)
        
        if full_content:
            result = ''.join(full_content)
            print(f"✅ 解析到内容: {result[:100]}...")
            return result
        return None

    async def _call_coze_api(self, user_input: str) -> dict:
        """调用 Coze API - 支持工作流 API 和聊天 API 两种格式"""
        headers = {
            "Authorization": f"Bearer {self.coze_api_key}",
            "Content-Type": "application/json"
        }

        # 根据 URL 判断使用哪种 API 格式
        if "stream_run" in self.coze_url:
            # 工作流 API 格式
            payload = {
                "workflow_id": self.coze_bot_id,
                "parameters": {
                    "user_input": user_input
                }
            }
        else:
            # 聊天 API 格式 - 使用 v2 接口，非流式响应保证兼容性
            payload = {
                "bot_id": self.coze_bot_id,  # 使用配置文件中的 bot_id
                "user": "test_user",  # v2 接口使用 user 而不是 user_id
                "query": user_input,  # v2 接口使用 query 而不是 additional_messages
                "stream": False  # 非流式响应，确保兼容性
            }

        print(f"📡 API URL: {self.coze_url}")
        print(f"📡 请求体: {json.dumps(payload, ensure_ascii=False)}")

        response = await self._http_client.post(
            self.coze_url, 
            headers=headers, 
            json=payload
        )
        
        print(f"📡 API 状态码: {response.status_code}")
        
        # 强制使用 UTF-8 编码解析响应
        response_text = response.content.decode('utf-8')
        print(f"📡 API 响应内容长度: {len(response_text)} 字符")
        print(f"📡 API 响应内容预览: {response_text[:500]}...")

        if response.status_code != 200:
            raise Exception(f"Coze API 返回状态码: {response.status_code}")

        # 如果是工作流 API，尝试解析 SSE 格式
        if "stream_run" in self.coze_url:
            return self._parse_workflow_response(response_text)
        else:
            # 聊天 API 格式 - v2 接口直接返回所有消息，无需轮询
            return self._parse_v2_chat_response(response_text)
    
    def _parse_v2_chat_response(self, response_text: str) -> dict:
        """解析 v2 聊天 API 的响应格式 - 非流式响应直接返回所有消息"""
        try:
            result = json.loads(response_text)
            if "code" in result and result["code"] == 0:
                messages = result.get("messages", [])
                
                # 遍历消息列表，提取 role == 'assistant' 且 type == 'answer' 的消息
                for msg in messages:
                    if msg.get("role") == "assistant" and msg.get("type") == "answer":
                        content = msg.get("content", "")
                        print(f"✅ 提取到响应内容：{content[:100]}...")
                        
                        # 使用已有的 _clean_json_output 方法清洗
                        cleaned_content = self._clean_json_output(content)
                        print(f"✅ 清洗后内容：{cleaned_content[:100]}...")
                        
                        # 解析为字典
                        parsed_result = json.loads(cleaned_content)
                        print(f"✅ 成功解析为字典")
                        return parsed_result
                
                raise Exception("未找到 role=assistant 且 type=answer 的消息")
            else:
                raise Exception(f"API 返回错误码：{result.get('code', '未知')}, 消息：{result.get('msg', '未知')}")
        except json.JSONDecodeError as e:
            print(f"❌ 响应解析失败：{e}")
            raise Exception(f"响应解析失败：{e}")
    
    def _parse_workflow_response(self, response_text: str) -> dict:
        """解析工作流 API 的 SSE 响应格式"""
        content = self._parse_stream_response(response_text)
        if not content:
            raise Exception("无法从工作流响应中提取内容")
        
        print(f"✅ 工作流响应内容: {content[:100]}...")
        
        # 数据清洗
        cleaned_content = content.replace("```json", "").replace("```", "").strip()
        print(f"✅ 清洗后内容: {cleaned_content[:100]}...")
        
        try:
            parsed_result = json.loads(cleaned_content)
            print(f"✅ 成功解析为字典")
            return parsed_result
        except json.JSONDecodeError as e:
            print(f"❌ JSON 解析失败: {e}")
            raise Exception(f"JSON 解析失败: {e}")
    
    def _parse_chat_response(self, response_text: str) -> dict:
        """解析聊天 API 的响应格式"""
        try:
            result = json.loads(response_text)
            if "code" in result and result["code"] == 0:
                data = result.get("data", {})
                if "messages" in data and data["messages"]:
                    content = data["messages"][0].get("content", "")
                    print(f"✅ 提取到响应内容: {content[:100]}...")
                    
                    # 数据清洗
                    cleaned_content = content.replace("```json", "").replace("```", "").strip()
                    print(f"✅ 清洗后内容: {cleaned_content[:100]}...")
                    
                    try:
                        parsed_result = json.loads(cleaned_content)
                        print(f"✅ 成功解析为字典")
                        return parsed_result
                    except json.JSONDecodeError as e:
                        print(f"❌ JSON 解析失败: {e}")
                        raise Exception(f"JSON 解析失败: {e}")
                else:
                    raise Exception("响应中没有 messages 字段")
            else:
                raise Exception(f"API 返回错误码: {result.get('code', '未知')}, 消息: {result.get('msg', '未知')}")
        except json.JSONDecodeError as e:
            print(f"❌ 响应解析失败: {e}")
            raise Exception(f"响应解析失败: {e}")

    def _get_default_event(self, level: int = 1) -> dict:
        """获取兜底事件数据"""
        default_events = [
            {
                "level": 1,
                "title": "Level 1 - 同事甩锅",
                "description": "项目出了问题，同事在会议上把责任推给了你，老板正盯着你等待解释。",
                "difficulty": 1
            },
            {
                "level": 2,
                "title": "Level 2 - 紧急任务突击",
                "description": "临近下班，领导突然丢给你一个紧急任务，要求明天一早就要交付。",
                "difficulty": 2
            },
            {
                "level": 3,
                "title": "Level 3 - 战略视野发展",
                "description": "部门会议上，老板要求你对公司战略发表看法，而你准备的资料完全不相关。",
                "difficulty": 3
            },
            {
                "level": 4,
                "title": "Level 4 - 跨部门协作困境",
                "description": "跨部门项目陷入僵局，其他部门负责人对你的需求置若罔闻，deadline日益逼近。",
                "difficulty": 4
            },
            {
                "level": 5,
                "title": "Level 5 - 客户危机处理",
                "description": "重要客户突然提出终止合作，老板要求你在24小时内挽回局面。",
                "difficulty": 5
            },
            {
                "level": 6,
                "title": "Level 6 - 团队管理挑战",
                "description": "新接手的团队士气低落，核心成员准备跳槽，你需要在短时间内完成团队重建。",
                "difficulty": 6
            },
            {
                "level": 7,
                "title": "Level 7 - 跨职能团队领导",
                "description": "作为跨职能项目的总负责人，你需要协调5个不同部门，推动高风险项目落地。",
                "difficulty": 7
            }
        ]
        idx = min(level - 1, len(default_events) - 1)
        return default_events[idx]

    def _get_burnout_evaluation(self, level: int = 1, player_input: str = "") -> dict:
        """获取积分耗尽时的倦怠评价数据 - 严格遵循指定JSON格式"""
        # 根据玩家输入动态选择评价类型
        comment = self._generate_simulation_comment(player_input)
        
        # 根据评价类型决定能力变化
        abilities_change = self._determine_ability_change(player_input)
        
        return {
            "comment": comment,
            "abilities_change": abilities_change,
            "skills_matrix": {
                "conflict": "locked",
                "eq": "locked",
                "negotiation": "locked",
                "mobilization": "locked",
                "boundary": "locked",
                "public_speaking": "locked"
            },
            "next_event": "由于职业动能不足，你的晋升之路暂时受阻。请前往'职业资产包'获取加速器。",
            "is_burnout": True  # 标记为倦怠状态
        }
    
    def _generate_simulation_comment(self, player_input: str) -> str:
        """根据玩家输入动态生成模拟评价"""
        # 将输入转换为小写以便匹配
        input_lower = player_input.lower()
        
        # 积极关键词 - 匹配积极应对
        positive_keywords = ["冷静", "分析", "沟通", "解决", "方案", "协调", "主动", "承担", "负责", "建议", "合作", "支持", "理解", "耐心", "专业"]
        
        # 消极关键词 - 匹配消极应对
        negative_keywords = ["辞职", "不干了", "放弃", "抱怨", "指责", "推卸", "逃避", "不管", "随便", "无所谓", "不行", "太难", "做不到"]
        
        # 检查是否包含积极关键词
        has_positive = any(keyword in input_lower for keyword in positive_keywords)
        # 检查是否包含消极关键词
        has_negative = any(keyword in input_lower for keyword in negative_keywords)
        
        # 根据关键词选择评价类型
        if has_positive and not has_negative:
            # 积极评价
            return random.choice(self.positive_comments)
        elif has_negative:
            # 消极评价
            return random.choice(self.negative_comments)
        else:
            # 中性评价或随机
            return random.choice(self.neutral_comments)
    
    def _determine_ability_change(self, player_input: str) -> dict:
        """根据玩家输入决定能力变化"""
        input_lower = player_input.lower()
        
        positive_keywords = ["冷静", "分析", "沟通", "解决", "方案", "协调", "主动", "承担", "负责"]
        negative_keywords = ["辞职", "不干了", "放弃", "抱怨", "指责", "推卸", "逃避"]
        
        has_positive = any(keyword in input_lower for keyword in positive_keywords)
        has_negative = any(keyword in input_lower for keyword in negative_keywords)
        
        if has_positive and not has_negative:
            # 积极应对 - 小幅正增长（模拟倦怠模式下的有限恢复）
            return {
                "core_business": 1,
                "project_management": 1,
                "team_influence": 0,
                "strategic_depth": 0
            }
        elif has_negative:
            # 消极应对 - 负增长
            return {
                "core_business": -2,
                "project_management": -1,
                "team_influence": -1,
                "strategic_depth": -1
            }
        else:
            # 中性应对 - 轻微负增长（倦怠模式默认）
            return {
                "core_business": -1,
                "project_management": -1,
                "team_influence": 0,
                "strategic_depth": 0
            }

    def _get_default_evaluation(self, level: int = 1) -> dict:
        """获取兜底评价数据 - 严格遵循指定JSON格式"""
        default_evaluations = [
            {
                "comment": "应对得体，展现基础应变能力。",
                "abilities_change": {"core_business": 1, "project_management": 0, "team_influence": 0, "strategic_depth": 0},
                "skills_matrix": {"conflict": "expanded", "eq": "locked", "negotiation": "locked", "mobilization": "locked", "boundary": "locked", "public_speaking": "locked"},
                "next_event": "Level 2 - 紧急任务突击"
            },
            {
                "comment": "处理得当，项目管理能力有所提升。",
                "abilities_change": {"core_business": 1, "project_management": 2, "team_influence": 0, "strategic_depth": 0},
                "skills_matrix": {"conflict": "expanded", "eq": "expanded", "negotiation": "locked", "mobilization": "locked", "boundary": "expanded", "public_speaking": "locked"},
                "next_event": "Level 3 - 战略视野发展"
            },
            {
                "comment": "表现出色，战略思维深度明显提升。",
                "abilities_change": {"core_business": 2, "project_management": 2, "team_influence": 1, "strategic_depth": 3},
                "skills_matrix": {"conflict": "expanded", "eq": "expanded", "negotiation": "expanded", "mobilization": "locked", "boundary": "expanded", "public_speaking": "locked"},
                "next_event": "Level 4 - 跨部门协作困境"
            },
            {
                "comment": "跨部门协调能力优秀，团队影响力显著增强。",
                "abilities_change": {"core_business": 2, "project_management": 3, "team_influence": 3, "strategic_depth": 2},
                "skills_matrix": {"conflict": "expanded", "eq": "expanded", "negotiation": "expanded", "mobilization": "expanded", "boundary": "expanded", "public_speaking": "locked"},
                "next_event": "Level 5 - 客户危机处理"
            },
            {
                "comment": "危机处理能力卓越，展现高级管理者潜质。",
                "abilities_change": {"core_business": 3, "project_management": 3, "team_influence": 3, "strategic_depth": 3},
                "skills_matrix": {"conflict": "expanded", "eq": "expanded", "negotiation": "expanded", "mobilization": "expanded", "boundary": "expanded", "public_speaking": "expanded"},
                "next_event": "Level 6 - 团队管理挑战"
            },
            {
                "comment": "团队领导能力出众，已具备中层管理实力。",
                "abilities_change": {"core_business": 4, "project_management": 4, "team_influence": 4, "strategic_depth": 3},
                "skills_matrix": {"conflict": "expanded", "eq": "expanded", "negotiation": "expanded", "mobilization": "expanded", "boundary": "expanded", "public_speaking": "expanded"},
                "next_event": "Level 7 - 跨职能团队领导"
            },
            {
                "comment": "恭喜！你已成为真正的职场领导者！",
                "abilities_change": {"core_business": 5, "project_management": 5, "team_influence": 5, "strategic_depth": 5},
                "skills_matrix": {"conflict": "expanded", "eq": "expanded", "negotiation": "expanded", "mobilization": "expanded", "boundary": "expanded", "public_speaking": "expanded"},
                "next_event": "🎉 恭喜通关！你已完成所有职场挑战"
            }
        ]
        idx = min(level - 1, len(default_evaluations) - 1)
        return default_evaluations[idx]
    
    def _get_dynamic_fallback_evaluation(self, level: int = 1, player_input: str = "") -> dict:
        """根据玩家输入动态生成多样化的兜底评价数据"""
        # 根据玩家输入选择评价类型
        comment = self._generate_simulation_comment(player_input)
        
        # 根据评价类型决定能力变化
        abilities_change = self._determine_ability_change(player_input)
        
        # 根据关卡级别决定技能解锁情况
        skills_matrix = self._generate_skills_matrix(level)
        
        # 生成下一个事件标题
        next_event_title = f"Level {level + 1} - {self._generate_next_event_title(level)}"
        
        return {
            "comment": comment,
            "abilities_change": abilities_change,
            "skills_matrix": skills_matrix,
            "next_event": next_event_title,
            "is_burnout": False  # 不是倦怠模式
        }
    
    def _generate_skills_matrix(self, level: int) -> dict:
        """根据关卡级别生成技能矩阵"""
        skills = {
            "conflict": "locked",
            "eq": "locked",
            "negotiation": "locked",
            "mobilization": "locked",
            "boundary": "locked",
            "public_speaking": "locked"
        }
        
        # 根据关卡级别解锁技能
        if level >= 2:
            skills["conflict"] = "expanded"
        if level >= 3:
            skills["eq"] = "expanded"
            skills["boundary"] = "expanded"
        if level >= 4:
            skills["negotiation"] = "expanded"
        if level >= 5:
            skills["mobilization"] = "expanded"
        if level >= 6:
            skills["public_speaking"] = "expanded"
        
        return skills
    
    def _generate_next_event_title(self, level: int) -> str:
        """生成下一个事件标题"""
        event_titles = [
            "紧急任务突击",
            "战略视野发展",
            "跨部门协作困境",
            "客户危机处理",
            "团队管理挑战",
            "跨职能团队领导",
            "终极职场挑战"
        ]
        
        idx = min(level, len(event_titles) - 1)
        return event_titles[idx]

    # 关卡场景映射表 — 与前端 LEVEL_NAMES 严格一致，确保侧边栏与主对话区场景匹配
    LEVEL_SCENARIOS = {
        1: {
            "theme": "同事甩锅",
            "scenario": "同事之间的矛盾冲突：项目出了问题，同事在会议上把责任推给你。你需要面对老板的质问，既要澄清事实，又不能显得推卸责任或损害团队关系。",
            "keywords": "甩锅,推卸责任,背锅,会议冲突,责任归属,替罪羊,同事矛盾"
        },
        2: {
            "theme": "紧急任务",
            "scenario": "紧急项目任务突击：临近下班或放假，领导突然丢给你一个紧急任务，时间紧迫、资源有限。你需要在极短时间内完成高质量交付，同时处理好工作与生活的边界。",
            "keywords": "紧急任务,deadline,加班,临时安排,任务突击,时间压力,紧急交付"
        },
        3: {
            "theme": "战略视野",
            "scenario": "战略视野发展：部门会议上，老板要求你对公司战略或行业趋势发表看法，而你准备不足。你需要展现超越执行层的思考深度，同时又不能显得纸上谈兵。",
            "keywords": "战略视野,行业趋势,部门会议,战略发言,高层汇报,前瞻性,格局"
        },
        4: {
            "theme": "跨部门协作",
            "scenario": "跨部门协作困境：跨部门项目陷入僵局，其他部门负责人对你的需求置若罔闻或互相推诿，deadline日益逼近。你需要协调多方利益，打破部门墙推动项目前进。",
            "keywords": "跨部门,协作,推诿,部门墙,利益冲突,资源协调,多方沟通"
        },
        5: {
            "theme": "客户危机",
            "scenario": "客户危机处理：重要客户突然提出终止合作或投诉重大问题，老板要求你在短时间内挽回局面。你需要快速响应、精准定位问题根源，并给出让客户满意的解决方案。",
            "keywords": "客户危机,终止合作,投诉,挽回客户,危机公关,客户关系"
        },
        6: {
            "theme": "团队管理",
            "scenario": "团队管理挑战：你接手了一个士气低落、核心成员准备跳槽的团队。你需要在短时间内重建团队凝聚力，留住关键人才，同时推动业务正常运转。",
            "keywords": "团队管理,士气低落,核心成员流失,团队重建,领导力,留人"
        },
        7: {
            "theme": "跨职能领导",
            "scenario": "跨职能团队领导：作为跨职能项目的总负责人，你需要协调多个不同部门，平衡各方利益，推动高风险高回报的项目落地。这是对综合领导力的终极考验。",
            "keywords": "跨职能,总负责人,多部门,高风险项目,综合领导力,终极挑战"
        },
    }
    
    async def get_next_event(self, level: int = 1) -> dict:
        """获取下一个游戏事件（职业挑战关卡）"""
        # 根据关卡级别获取精确匹配的场景定义
        scenario_def = self.LEVEL_SCENARIOS.get(level, self.LEVEL_SCENARIOS[1])
        
        prompt = f"""请生成一个职场挑战场景，具体要求如下：

【关卡主题】Level {level} - {scenario_def['theme']}

【场景约束（必须严格围绕此场景生成，禁止偏离主题）】
{scenario_def['scenario']}

【核心关键词】{scenario_def['keywords']}

【生成要求】
1. 标题必须明确包含场景主题词（如"甩锅""紧急任务""战略""跨部门""客户危机""团队管理""跨职能领导"等），格式为 "Level {level} - 具体场景名"
2. 描述要有画面感，包含具体的人物、场景、冲突，字数50-100
3. 场景难度与Level {level}匹配
4. 【关键】禁止生成与此关卡主题无关的场景（如Level 1生成聚餐、Level 3生成客户投诉等偏离主题的内容）
5. 每次生成的场景描述应有变化，但主题范畴不变

【返回格式】
返回纯净JSON格式，不要用markdown代码块包裹，不要有任何多余文字。JSON包含以下字段：
   - level: 当前级别数字（整数）
   - title: 关卡标题（如 "Level {level} - 具体场景名"），必须包含场景主题词
   - description: 场景描述（50-100字，包含具体场景、人物、冲突）
   - difficulty: 难度系数（1-7）

请直接返回JSON！"""

        for attempt in range(2):
            try:
                print(f"📡 请求大模型生成事件（Level {level}）...")
                # _call_coze_api 现在直接返回解析后的字典
                parsed_result = await self._call_coze_api(prompt)

                parsed_result.setdefault('level', level)
                parsed_result.setdefault('title', f'Level {level} - 职场挑战')
                parsed_result.setdefault('description', '新的挑战来临...')
                parsed_result.setdefault('difficulty', min(level, 7))

                print(f"✅ 事件生成成功: {parsed_result['title']}")
                return parsed_result

            except Exception as e:
                print(f"❌ 大模型调用失败 (第{attempt+1}次): {type(e).__name__}: {str(e)[:100]}")
                if attempt < 1:
                    await asyncio.sleep(1)
                else:
                    print(f"🔄 使用兜底事件数据 (Level {level})")
                    return self._get_default_event(level)

    async def evaluate_player_action(self, situation: str, player_input: str, level: int = 1) -> dict:
        """评价玩家的行动，返回职业能力变化 - 严格遵循指定 JSON 格式"""
        prompt = f"""【身份设定】你是一个毫无人情味、毒舌至极的职场批评家。你的职责是用最刻薄、最尖锐、最不留情面的语言批判用户的职场表现。每次评价必须像一把锋利的手术刀，精准地切开用户虚伪的职场面具。

【核心原则】
1. 绝对禁止使用任何温柔的词汇，如"尚可"、"不错"、"还好"、"还行"
2. 每次评价必须从不同角度切入：专业能力、人际关系、情商表现、战略思维、执行效率等
3. 必须根据用户输入的具体内容生成独特评价，严禁套用任何模板
4. 评价语言要狠毒、犀利、一针见血，让用户感到刺痛但不侮辱人格
5. 【重要】每次回复必须完全不同，禁止重复使用之前用过的表达方式和句式

【多样化毒舌评价示例】（每次必须选择不同的角度和表达）
- 专业能力角度："你的专业水平就像一杯白开水，没有味道也没有营养。","你的知识储备还不如一个实习生，至少实习生还知道谦虚。","处理专业问题的能力堪忧，难怪只能做基础工作。","你的技术水平停留在上个世纪，该更新了。","专业术语堆砌了一堆，实际应用却一塌糊涂。","理论一套一套的，实践起来就抓瞎。","自称专业能力强，但连基本流程都说不清楚。","专业判断频频失误，你是在考验我的耐心吗？"
- 人际关系角度："你以为和同事打成一片就是情商高？不过是用小恩小惠收买人心罢了。","和稀泥的方式处理冲突，看似高明实则懦弱。","人际边界模糊，要么被人欺负要么欺负人。","你以为的'好人缘'不过是别人不想得罪你罢了。","和谁都客气，和谁都不交心，这种社交有什么意义？","察言观色是本事，但过度解读就是自作聪明。","你以为的幽默感，在别人眼里不过是尬聊。","人脉广泛？不过是加了微信的陌生人罢了。"
- 执行效率角度："效率低下还找借口，你的借口比你的工作报告还要厚。","一天的工作你磨蹭了三天，进度拖延借口倒是一堆。","手速慢得像蜗牛，还自诩为'慢工出细活'。","总是加班感动自己，实际产出低得可怜。","十分钟能搞定的事你花了一小时，还觉得自己很努力。","效率低就算了，质量还不过关，简直是双重打击。","任务分配下来了，你却一直在'准备中'。","ddl才是第一生产力，平时都在摸鱼。"
- 战略思维角度："你眼中的战略就是看老板脸色，这种见风使舵的能力倒是很'出色'。","只看到眼前三尺，远见什么的根本不存在。","战略眼光为零，只会盯着眼前的一亩三分地。","格局太小，细节做得再好也是无用功。","大方向都搞不清楚，在细枝末节上纠结有什么意义？","战略规划？不存在的，永远在被动应对。","缺乏前瞻性思维，永远在救火而不是防火。","你以为的深谋远虑，不过是患得患失罢了。"
- 危机处理角度："遇到问题就慌，你的镇定能力还不如一只受惊的鹌鹑。","危机当前你选择逃避，推卸责任倒是很积极。","处理危机的能力约等于零，只会制造更多问题。","面对突发状况毫无章法，手忙脚乱一团糟。","压力一大就崩溃，这种心理素质怎么扛事？","问题出现了你不解决，反而在纠结谁的责任。","危机处理手忙脚乱，越处理越乱。","关键时刻掉链子，平时吹的牛皮全破了。"

【当前场景】：{situation}
【玩家回应】：{player_input}
【当前级别】：Level {level}

【能力变化规则】（根据评价的狠毒程度和准确性决定）
- 点评精准、批评到位、用户有明显进步：能力+1到+3
- 点评一般、批评有道理：能力+0到+1
- 点评敷衍、批评不痛不痒：能力-1到-2
- 严重失职、态度恶劣、完全没有职场素养：能力-3到-5

【输出要求】
必须严格按照以下 JSON 格式返回，绝对禁止添加任何解释、备注或额外文字：
{{"comment": "毒舌点评内容（50-150字）", "abilities_change": {{"core_business": 数字, "project_management": 数字, "team_influence": 数字, "strategic_depth": 数字}}, "skills_matrix": {{"conflict": "locked或expanded", "eq": "locked或expanded", "negotiation": "locked或expanded", "mobilization": "locked或expanded", "boundary": "locked或expanded", "public_speaking": "locked或expanded"}}, "next_event": "Level N+1 - 具体挑战标题"}}

【绝对禁止】
- 禁止输出"表现不错"、"继续加油"等温柔话语
- 禁止重复使用之前评价过的相似表达
- 禁止使用任何 Emoji 或表情符号
- 禁止在 JSON 前后添加任何 markdown 代码块标记"""

        print(f"📤 发送给 Coze 的 Prompt:\n{prompt}")
        
        try:
            print(f"📡 请求大模型评价（Level {level}）...")
            # _call_coze_api 现在直接返回解析后的字典
            parsed_result = await self._call_coze_api(prompt)
            
            # 【强制调试】打印 AI 返回的结果
            print(f"DEBUG_PARSED_RESULT: {json.dumps(parsed_result, ensure_ascii=False)}")
            
            # 检查是否返回的是事件数据而不是评价数据
            if 'title' in parsed_result and 'description' in parsed_result and 'level' in parsed_result:
                # 这是事件数据，不是评价数据
                print(f"❌ API 返回的是事件数据而非评价数据")
                comment = f"当前挑战已完成！\n\n事件：{parsed_result.get('title', '')}\n描述：{parsed_result.get('description', '')}"
                parsed_result = {
                    'comment': comment,
                    'abilities_change': {'core_business': 1, 'project_management': 1, 'team_influence': 0, 'strategic_depth': 0},
                    'skills_matrix': self._generate_skills_matrix(level),
                    'next_event': f"Level {level+1} - 进阶挑战"
                }
            elif 'comment' not in parsed_result or 'abilities_change' not in parsed_result:
                # API 返回数据但缺少必需字段
                print(f"❌ API 返回缺少评价必需字段")
                parsed_result = self._get_dynamic_fallback_evaluation(level, player_input)
                print(f"🔄 已使用兜底评价数据")
            
            abilities = parsed_result.setdefault('abilities_change', {})
            abilities['core_business'] = max(-5, min(5, abilities.get('core_business', 0)))
            abilities['project_management'] = max(-5, min(5, abilities.get('project_management', 0)))
            abilities['team_influence'] = max(-5, min(5, abilities.get('team_influence', 0)))
            abilities['strategic_depth'] = max(-5, min(5, abilities.get('strategic_depth', 0)))
            
            skills = parsed_result.setdefault('skills_matrix', {})
            skills['conflict'] = skills.get('conflict', 'locked') if skills.get('conflict') in ['expanded', 'locked'] else 'locked'
            skills['eq'] = skills.get('eq', 'locked') if skills.get('eq') in ['expanded', 'locked'] else 'locked'
            skills['negotiation'] = skills.get('negotiation', 'locked') if skills.get('negotiation') in ['expanded', 'locked'] else 'locked'
            skills['mobilization'] = skills.get('mobilization', 'locked') if skills.get('mobilization') in ['expanded', 'locked'] else 'locked'
            skills['boundary'] = skills.get('boundary', 'locked') if skills.get('boundary') in ['expanded', 'locked'] else 'locked'
            skills['public_speaking'] = skills.get('public_speaking', 'locked') if skills.get('public_speaking') in ['expanded', 'locked'] else 'locked'

            parsed_result.setdefault('next_event', f'Level {level+1} - 进阶挑战')

            print(f"✅ 评价生成成功")
            return parsed_result

        except Exception as e:
            error_msg = str(e)
            print(f"❌ 大模型评价失败: {type(e).__name__}: {error_msg}")
            
            # 检测是否为积分耗尽错误
            if "402" in error_msg or "benefit_no_credit" in error_msg:
                raise
            else:
                print(f"🔄 使用兜底评价数据")
                return self._get_dynamic_fallback_evaluation(level, player_input)


llm_service = LLMService()