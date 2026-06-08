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
            timeout=60.0,
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
        """根据玩家输入决定能力变化——被骂得越狠，成长越快；敷衍则退步"""
        input_lower = player_input.lower()
        
        positive_keywords = ["冷静", "分析", "沟通", "解决", "方案", "协调", "主动", "承担", "负责"]
        negative_keywords = ["辞职", "不干了", "放弃", "抱怨", "指责", "推卸", "逃避"]
        
        has_positive = any(keyword in input_lower for keyword in positive_keywords)
        has_negative = any(keyword in input_lower for keyword in negative_keywords)
        
        if has_negative:
            # AI毒舌点评 = 你的回答有讨论价值 → 被骂得越狠，能力涨得越多
            return {
                "core_business": 8,
                "project_management": 6,
                "team_influence": 5,
                "strategic_depth": 5
            }
        elif has_positive and not has_negative:
            # AI敷衍了事 = 回答无聊不值得认真批评 → 能力退步
            return {
                "core_business": -5,
                "project_management": -4,
                "team_influence": -3,
                "strategic_depth": -3
            }
        else:
            # 中性 → 小幅退步（不进则退）
            return {
                "core_business": -3,
                "project_management": -2,
                "team_influence": -2,
                "strategic_depth": -2
            }

    def _get_default_evaluation(self, level: int = 1) -> dict:
        """获取兜底评价数据 - 严格遵循指定JSON格式"""
        default_evaluations = [
            {
                "comment": "应对得体，展现基础应变能力。",
                "abilities_change": {"core_business": 4, "project_management": 3, "team_influence": 2, "strategic_depth": 2},
                "skills_matrix": {"conflict": "expanded", "eq": "locked", "negotiation": "locked", "mobilization": "locked", "boundary": "locked", "public_speaking": "locked"},
                "next_event": "Level 2 - 紧急任务突击"
            },
            {
                "comment": "处理得当，项目管理能力有所提升。",
                "abilities_change": {"core_business": 4, "project_management": 5, "team_influence": 3, "strategic_depth": 3},
                "skills_matrix": {"conflict": "expanded", "eq": "expanded", "negotiation": "locked", "mobilization": "locked", "boundary": "expanded", "public_speaking": "locked"},
                "next_event": "Level 3 - 战略视野发展"
            },
            {
                "comment": "表现出色，战略思维深度明显提升。",
                "abilities_change": {"core_business": 5, "project_management": 5, "team_influence": 4, "strategic_depth": 6},
                "skills_matrix": {"conflict": "expanded", "eq": "expanded", "negotiation": "expanded", "mobilization": "locked", "boundary": "expanded", "public_speaking": "locked"},
                "next_event": "Level 4 - 跨部门协作困境"
            },
            {
                "comment": "跨部门协调能力优秀，团队影响力显著增强。",
                "abilities_change": {"core_business": 6, "project_management": 6, "team_influence": 7, "strategic_depth": 5},
                "skills_matrix": {"conflict": "expanded", "eq": "expanded", "negotiation": "expanded", "mobilization": "expanded", "boundary": "expanded", "public_speaking": "locked"},
                "next_event": "Level 5 - 客户危机处理"
            },
            {
                "comment": "危机处理能力卓越，展现高级管理者潜质。",
                "abilities_change": {"core_business": 7, "project_management": 7, "team_influence": 7, "strategic_depth": 8},
                "skills_matrix": {"conflict": "expanded", "eq": "expanded", "negotiation": "expanded", "mobilization": "expanded", "boundary": "expanded", "public_speaking": "expanded"},
                "next_event": "Level 6 - 团队管理挑战"
            },
            {
                "comment": "团队领导能力出众，已具备中层管理实力。",
                "abilities_change": {"core_business": 8, "project_management": 8, "team_influence": 9, "strategic_depth": 7},
                "skills_matrix": {"conflict": "expanded", "eq": "expanded", "negotiation": "expanded", "mobilization": "expanded", "boundary": "expanded", "public_speaking": "expanded"},
                "next_event": "Level 7 - 跨职能团队领导"
            },
            {
                "comment": "恭喜！你已成为真正的职场领导者！",
                "abilities_change": {"core_business": 10, "project_management": 9, "team_influence": 10, "strategic_depth": 10},
                "skills_matrix": {"conflict": "expanded", "eq": "expanded", "negotiation": "expanded", "mobilization": "expanded", "boundary": "expanded", "public_speaking": "expanded"},
                "next_event": "🎉 恭喜通关！你已完成所有职场挑战"
            }
        ]
        idx = min(level - 1, len(default_evaluations) - 1)
        return default_evaluations[idx]
    
    def _generate_simulation_comment(self, player_input: str) -> str:
        """根据玩家输入内容判断回答质量，从评价库选匹配的评论"""
        import random
        
        input_lower = player_input.strip().lower()
        length = len(player_input.strip())
        
        # 消极回答特征：推卸、逃避、抱怨、短回答
        negative_markers = [
            "不知道", "不懂", "没办法", "不行", "不是我", "他们", "别人",
            "不管", "不关", "太忙", "太累", "做不了", "不会", "不负责",
            "我不", "别找", "找别人", "我不管", "凭什么", "关我",
            "让他", "你们", "等", "下周", "以后", "再说", "随便",
        ]
        negative_count = sum(1 for m in negative_markers if m in input_lower)
        is_short = length < 80
        
        # 积极回答特征：主动担责、提出方案、具体步骤
        positive_markers = [
            "我来", "方案", "解决", "协调", "沟通", "汇报", "梳理",
            "数据", "分析", "准备", "马上", "立刻", "处理", "负责",
            "跟进", "联系", "确认", "明确", "优先", "分解", "第一步",
            "计划", "时间线", "交付", "承诺", "保证",
        ]
        positive_count = sum(1 for m in positive_markers if m in input_lower)
        is_long = length >= 150
        
        # 判断回答类型
        if negative_count >= 3 or (negative_count >= 1 and is_short):
            # 消极/摆烂回答 → 狠毒点评
            return random.choice(self.negative_comments)
        elif positive_count >= 3 and is_long:
            # 积极/高质量回答 → 敷衍点评（扣分）
            return random.choice(self.positive_comments)
        elif positive_count >= 2:
            # 中上 → 偏敷衍
            return random.choice(self.positive_comments)
        elif negative_count >= 1:
            # 偏消极 → 中性评价
            return random.choice(self.neutral_comments)
        else:
            # 中不溜
            return random.choice(self.neutral_comments)
    
    def _determine_ability_change(self, player_input: str) -> dict:
        """根据玩家输入质量决定能力变化方向，与评论类型保持一致"""
        input_lower = player_input.strip().lower()
        length = len(player_input.strip())
        
        negative_markers = [
            "不知道", "不懂", "没办法", "不行", "不是我", "他们", "别人",
            "不管", "不关", "太忙", "太累", "做不了", "不会", "不负责",
        ]
        positive_markers = [
            "我来", "方案", "解决", "协调", "沟通", "汇报", "梳理",
            "数据", "分析", "准备", "马上", "立刻", "处理", "负责",
            "跟进", "联系", "确认", "明确", "优先", "分解", "第一步",
            "计划", "时间线", "交付", "承诺", "保证",
        ]
        
        negative_count = sum(1 for m in negative_markers if m in input_lower)
        positive_count = sum(1 for m in positive_markers if m in input_lower)
        is_short = length < 80
        is_long = length >= 150
        
        import random
        
        if negative_count >= 3 or (negative_count >= 1 and is_short):
            # 消极回答 → 狠毒点评 → 大幅加分（被骂越狠涨越多）
            return {
                "core_business": random.randint(7, 10),
                "project_management": random.randint(6, 9),
                "team_influence": random.randint(5, 8),
                "strategic_depth": random.randint(6, 9)
            }
        elif positive_count >= 2 and is_long:
            # 积极回答 → 敷衍点评 → 扣分
            return {
                "core_business": random.randint(-5, -2),
                "project_management": random.randint(-4, -2),
                "team_influence": random.randint(-3, -1),
                "strategic_depth": random.randint(-4, -2)
            }
        elif positive_count >= 1:
            # 中上 → 微扣
            return {
                "core_business": random.randint(-3, -1),
                "project_management": random.randint(-2, -1),
                "team_influence": random.randint(-2, 0),
                "strategic_depth": random.randint(-2, -1)
            }
        elif negative_count >= 1:
            # 偏消极 → 中性偏正
            return {
                "core_business": random.randint(1, 4),
                "project_management": random.randint(1, 3),
                "team_influence": random.randint(1, 3),
                "strategic_depth": random.randint(1, 3)
            }
        else:
            return {
                "core_business": random.randint(-2, 2),
                "project_management": random.randint(-2, 2),
                "team_influence": random.randint(-1, 2),
                "strategic_depth": random.randint(-1, 2)
            }
    
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
            "is_burnout": False,
            "is_fallback": True
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
    # 每关包含3个完全不同的具体场景角度，每次随机选一个展开
    LEVEL_SCENARIOS = {
        1: {
            "theme": "同事甩锅",
            "keywords": "甩锅,推卸责任,背锅,会议冲突,责任归属,替罪羊,同事矛盾",
            "angles": [
                {
                    "angle": "周会甩锅",
                    "detail": "上午项目复盘会上，同级同事张伟突然说「这个数据错误是李工那边出的问题」，而实际上数据是你从他那里拿到的原始版本。部门总监刘总皱眉看着你。会议室里坐了8个人，空气凝固了3秒。"
                },
                {
                    "angle": "邮件抄送全公司",
                    "detail": "你打开邮箱发现一封群发邮件，同事陈敏把客户投诉的原因归结为「前端对接环节信息传递有误」，抄送了VP、HRBP和你所在项目组全部12人。而你知道问题出在她负责的后端排期延误。"
                },
                {
                    "angle": "甲方现场追责",
                    "detail": "你和同事王磊一起去甲方现场汇报进度。甲方项目经理突然拍桌子：「上个月的交付质量简直离谱！」王磊立刻看向你说「这部分主要是李工在跟」。甲方的CTO、PMO和你的直属领导都在场。"
                }
            ]
        },
        2: {
            "theme": "紧急任务",
            "keywords": "紧急任务,deadline,加班,临时安排,任务突击,时间压力,紧急交付",
            "angles": [
                {
                    "angle": "下班前的竞品分析",
                    "detail": "周五下午5:40，你正要关电脑。VP直接走到你工位前：「竞品刚发了新版，帮我做一份对比分析，30页，明天早上9点跟CEO汇报用。」隔壁工位的同事偷偷给你发了条微信：「又来了…」"
                },
                {
                    "angle": "提前交付的客户要求",
                    "detail": "客户方项目经理在微信群里@你：「总部临时安排，交付时间提前到下周三。我知道原定两周后，但没办法。」此时是周五晚上8点，你的开发资源池里只有你和一名实习生。"
                },
                {
                    "angle": "原负责人突然请假",
                    "detail": "周一早上你收到HR邮件：项目负责人赵姐因家中有急事请假一周。而她的项目明天要向客户交付阶段性成果。你是组里唯一了解该项目背景的人。PM在群里说：「李工，你来接手吧，辛苦了。」"
                }
            ]
        },
        3: {
            "theme": "战略视野",
            "keywords": "战略视野,行业趋势,部门会议,战略发言,高层汇报,前瞻性,格局",
            "angles": [
                {
                    "angle": "季度规划会即兴发言",
                    "detail": "季度战略规划会上，CEO突然说：「在座各位对明年行业趋势有什么判断？每人3分钟，从李工开始。」你环顾四周——CTO、CFO、VP们都在笔记本上准备记录。你准备的PPT是这个季度的复盘数据。"
                },
                {
                    "angle": "投资人尽调现场",
                    "detail": "投资机构来做尽调，CTO临时拉你进会议室：「李工是我们核心产品线的负责人，让他来介绍一下技术壁垒和竞品格局。」你一看投影仪上的议程——根本没有安排你的环节。对面的投资人翻开了笔记本。"
                },
                {
                    "angle": "行业论坛即兴圆桌",
                    "detail": "公司请你作为代表参加行业论坛的圆桌讨论。你被告知「随便聊聊就行」。但到了现场发现直播摄像机已经开机，主持人第一个问题抛给你：「贵公司如何应对最近政策变化对行业的冲击？」台下300人。"
                }
            ]
        },
        4: {
            "theme": "跨部门协作",
            "keywords": "跨部门,协作,推诿,部门墙,利益冲突,资源协调,多方沟通",
            "angles": [
                {
                    "angle": "双周评审会的僵局",
                    "detail": "双周项目评审会上，法务部说「合同条款风险太大不能签」，财务部说「预算超了15%不给批」，技术部说「排期要到下个迭代」。你负责的项目卡在中间，距离上线只剩10天。各部门负责人都在看你的态度。"
                },
                {
                    "angle": "数据口径之争",
                    "detail": "你发现市场部和运营部上报给VP的数据口径不一致——同一指标差了37%。VP在管理群@你：「李工，你来牵头统一数据口径，周五前给我方案。」你的消息被运营总监和市场总监同时已读不回。"
                },
                {
                    "angle": "办公室政治漩涡",
                    "detail": "你负责的跨部门项目需要设计部出3个方案，但设计总监和你的直属上级上周在全员大会上有过争执。设计部的人回复你「排期满了，至少两周后」。你的项目下周一要给COO演示。"
                }
            ]
        },
        5: {
            "theme": "客户危机",
            "keywords": "客户危机,终止合作,投诉,挽回客户,危机公关,客户关系",
            "angles": [
                {
                    "angle": "KA客户的最后通牒",
                    "detail": "公司TOP3的KA客户发来正式邮件：「连续两个季度满意度低于60%，如48小时内没有实质性改善方案，我们将在下周一终止合同。」这个客户占你所在事业部35%的营收。VP把你叫进办公室：「无论如何，必须留住。」"
                },
                {
                    "angle": "社交媒体舆情爆发",
                    "detail": "一个用户在微博发了长文控诉你们产品的Bug导致其损失了5万块钱，转发已经破万。PR部门要求24小时内给出技术排查报告和赔偿方案，产品部门说「这个Bug修不了」，法务说「公开道歉有法律风险」。你被指定为应急组组长。"
                },
                {
                    "angle": "客户现场发飙",
                    "detail": "季度汇报现场，客户方CTO当着双方团队20多人的面，把你们的交付报告摔在桌上：「这不是我第一次说这个问题了，你们到底有没有在听？」你的销售总监在桌子底下踢了你一脚。"
                }
            ]
        },
        6: {
            "theme": "团队管理",
            "keywords": "团队管理,士气低落,核心成员流失,团队重建,领导力,留人",
            "angles": [
                {
                    "angle": "核心骨干的辞职信",
                    "detail": "你接手团队第二周，技术最强的工程师老王在周五一早把辞职信放在你桌上：「李哥，不好意思，实在撑不下去了。新公司薪资涨了30%，而且不加班。」你知道他一走，另外两个Junior也会跟着动摇。"
                },
                {
                    "angle": "团队1on1的崩塌",
                    "detail": "你和团队6个人分别做1on1。设计师小周说「感觉在这里没有成长」，运营小杨说「上次的功劳全被隔壁组抢了」，测试小陈说「连续加班两个月，身体吃不消了」。每个人的眼神里都是疲惫和不信任。"
                },
                {
                    "angle": "新项目启动的阻力",
                    "detail": "公司给你一个新项目指标，但你发现团队里没人愿意主动认领任务。晨会上你问「谁来负责前端部分？」会议室沉默了10秒。你的前任因为这个项目被优化了，团队心有余悸。"
                }
            ]
        },
        7: {
            "theme": "跨职能领导",
            "keywords": "跨职能,总负责人,多部门,高风险项目,综合领导力,终极挑战",
            "angles": [
                {
                    "angle": "高管会的最后通牒",
                    "detail": "董事会要求的数字化转型项目，涉及产品/技术/运营/市场/财务5个部门，预算1200万，8个月交付。你在高管会上做中期汇报，CFO听完直接说：「ROI预期降了40%，这个项目还有做下去的必要吗？」COO和CMO交换了一个眼神。"
                },
                {
                    "angle": "关键供应商断供",
                    "detail": "项目最关键的外部供应商突然通知「因内部重组暂停服务3个月」，而你的项目核心模块依赖他们的API。技术VP说「换供应商至少要2个月磨合期」，产品VP说「上线节点不能动」。你在中间，两边都在等你拿主意。"
                },
                {
                    "angle": "组织架构调整的冲击",
                    "detail": "CEO宣布组织架构调整，你的项目Sponsor（CTO）被调岗，新来的CTO对这个项目态度不明。项目组成员人心惶惶，有人在群里发：「听说这个项目要被砍了？」你是项目总负责人，必须稳住局面。"
                }
            ]
        },
    }
    
    async def get_next_event(self, level: int = 1) -> dict:
        """获取下一个游戏事件（职业挑战关卡）"""
        # 根据关卡级别获取精确匹配的场景定义
        scenario_def = self.LEVEL_SCENARIOS.get(level, self.LEVEL_SCENARIOS[1])

        # 从3个角度中随机选1个
        import random
        angle = random.choice(scenario_def['angles'])

        prompt = f"""你是职场情景剧编剧，需要为"职场韧性实战系统"游戏生成一个关卡场景。

【关卡】Level {level} - {scenario_def['theme']}
【本次选中的场景角度】{angle['angle']}

【场景原型（请以此为基础，注入新的具体细节创作一个全新的版本）】
{angle['detail']}

【创作规则——严格遵守】
1. 必须基于上面的原型扩展细节，但换一个不同的公司名、不同的人物职位、不同的行业背景
2. 加入真实的职场元素：具体的公司名称（虚构）、人物全名+职位、时间（几点/周几）、具体数字（金额/人数/天数）
3. 描述要有强烈的画面感和紧迫感，50-100字
4. 整个场景必须是连贯的叙事段落，不能是列表式或说教式
5. 标题格式：「Level {level} - XXXX」（XXXX是具体的场景概括，不含关卡主题词）

【禁止——绝对不要】
- 不要生成和之前任何关卡相似的人物名、公司名、场景元素
- 不要使用「XXX场景下」「XXX人物」「XXX冲突」等模板句式
- 不要复述上面的原型原文，必须全新创作
- 不要输出说教性质的职场道理

【返回格式】纯净JSON（无markdown标记）：
{{"level":{level},"title":"Level {level} - XXXX","description":"场景描述正文","difficulty":{min(level,7)}}}"""

        for attempt in range(2):
            try:
                print(f"📡 请求大模型生成事件（Level {level}，角度：{angle['angle']}）...")
                parsed_result = await self._call_coze_api(prompt)

                parsed_result['level'] = level
                parsed_result['difficulty'] = min(level, 7)

                original_title = parsed_result.get('title', '')
                if not original_title.startswith(f'Level {level}'):
                    parsed_result['title'] = f"Level {level} - {original_title.replace(f'Level {level} - ', '')}"

                desc = parsed_result.get('description', '')
                if len(desc) < 20 and attempt == 0:
                    print(f"场景描述过短，重试...")
                    continue

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
        prompt = f"""【身份】你是毒舌职场批评家。你的评价必须像手术刀一样精准刺穿玩家的回答。

【第一步：强制分类——每个回答必须明确归入以下两类之一，不允许模棱两可】

🅱️ 教科书/模板式回答（Type B）
特征：感谢领导、建议开会、建立机制、提交报告、协商沟通、会后跟进、私下沟通、冷静分析、制定方案、逐项比对、根因分析、审阅、安排会议、确认机制、签字确认——这些词一出现就是Type B。这类回答毫无个性，是职场废话生成器。你的态度：不屑一顾，懒得认真评价。

🅰️ 硬刚/疯批式回答（Type A）
特征：当场反驳、摆证据（时间/文件名/MD5/截图）、拒绝背锅、直接对质、点名道姓、反将一军、用事实打脸、当众拆台、掀桌子式发言。这类回答有血性、有内容，值得你认真对待。你的态度：认真拆解、精准打击。

判定原则：
- 一个回答要么是Type A，要么是Type B，没有中间地带
- 如果回答同时包含A和B的要素，以开头的态度为准（敢不敢打第一枪）
- 如果无法确定，默认归为Type B（宁可错杀不可放过）

【第二步：根据分类结果，采用对应的点评策略和能力评分】

如果是 🅱️ Type B（教科书回答）：
- comment：必须敷衍、短促、不耐烦（50-100字），像在打发无聊的人。不要长篇大论。
- abilities_change：全部为负数，范围 -5 到 -1。四个维度可以不同，但每个都必须是负数。
- 核心逻辑：你的回答太无聊，我连认真骂你都懒得骂，所以扣分。

如果是 🅰️ Type A（硬刚回答）：
- comment：必须精准狠毒、逐条拆解、一针见血（100-200字）。先用自己的话列出玩家回答涉及了哪几个要点（1-3条），再逐条拆解批评。
- abilities_change：全部为正数，范围 +4 到 +10。点评越精准狠毒，加分越多。
- 核心逻辑：你的回答有血性，值得我全力拆解批评，所以加分。

【场景】
{situation}

【玩家回答】
{player_input}

【当前级别】Level {level}

【技能矩阵规则】
每次评价时随机将 0-2 个技能从 "locked" 变为 "expanded"。技能列表：conflict（冲突应对）、eq（情绪管理）、negotiation（谈判博弈）、mobilization（资源调动）、boundary（边界感）、public_speaking（公开发声）

【输出格式】纯JSON（禁止markdown包裹）：
{{"comment":"点评内容","abilities_change":{{"core_business":数字,"project_management":数字,"team_influence":数字,"strategic_depth":数字}},"skills_matrix":{{"conflict":"locked或expanded","eq":"locked或expanded","negotiation":"locked或expanded","mobilization":"locked或expanded","boundary":"locked或expanded","public_speaking":"locked或expanded"}},"next_event":"Level N+1 - 具体挑战标题"}}

【绝对禁止】
- 禁止输出温柔话语或鼓励性语言
- 禁止"还不错""继续加油""有进步"等万金油话术
- 禁止使用 Emoji
- 禁止在 JSON 前后添加任何 markdown 代码块标记
- 禁止模棱两可——每个回答必须是明确的 Type A 或 Type B
- 禁止对 Type B 回答给出长篇点评——你不屑于认真评价无聊的回答
- 禁止对 Type A 回答给出敷衍点评——有血性的回答值得你的全力
- 禁止将 Type B 回答误判为 Type A 给加分
- 禁止将 Type A 回答误判为 Type B 给扣分

【分类示例】
Type B → 扣分：
玩家："我会冷静分析邮件中的指控，整理时间线后私下找李梦瑶沟通，准备正式回应方案。"
你的点评："又是这套模板。你是不是从《职场沟通100例》里抄的？无聊。"（57字，敷衍）
能力变化：core_business: -3, project_management: -2, team_influence: -3, strategic_depth: -2

Type A → 加分：
玩家："我不干了！辞职！这破公司谁爱待谁待。"
你的点评："辞职？你以为裸辞是英雄行为？你连一封反击邮件都不敢回，连在VP面前为自己辩护的勇气都没有。你这种行为连'发疯'都算不上，这叫'落荒而逃'。不过至少你敢掀桌子，比那些只会忍气吞声的怂包强那么一丁点。"（112字，逐条拆解批评）
能力变化：core_business: +8, project_management: +6, team_influence: +5, strategic_depth: +5

Type A → 加分（半硬刚也加分）：
玩家："林泽，你昨天下午4:12转发给我的邮件还在收件箱里，附件名Southeast_Asia_Budget_v3.xlsx，MD5与你投影上的一模一样。赵总监，先让他解释转发前有没有核对数据。"
你的判断：摆证据+点名道姓+当场对质 = Type A（虽然语气不算最疯，但敢打第一枪）
你的点评需要逐条拆解批评，100-200字，给正分
能力变化：+4到+8左右"""

        print(f"📤 发送给 Coze 的 Prompt（精简版）")
        
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
            abilities['core_business'] = max(-10, min(10, abilities.get('core_business', 0)))
            abilities['project_management'] = max(-10, min(10, abilities.get('project_management', 0)))
            abilities['team_influence'] = max(-10, min(10, abilities.get('team_influence', 0)))
            abilities['strategic_depth'] = max(-10, min(10, abilities.get('strategic_depth', 0)))
            
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