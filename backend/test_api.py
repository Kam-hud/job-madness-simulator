#!/usr/bin/env python3
"""测试扣子（Coze）API 连接 - 支持流式响应解析"""

import os
import sys
import json
import re
import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))


def load_env():
    """从 .env 文件加载环境变量"""
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    os.environ[key] = value.strip()


def clean_json_output(text):
    """清理可能包含的 markdown 代码块标记"""
    text = text.strip()
    if text.startswith('```json'):
        text = text[7:]
    elif text.startswith('```'):
        text = text[3:]
    if text.endswith('```'):
        text = text[:-3]
    text = text.strip()
    return text


def parse_stream_response(response_text):
    """解析流式响应，提取大模型返回的内容"""
    lines = response_text.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        if line.startswith('data: '):
            try:
                data_str = line[5:]  # 去掉 'data: ' 前缀
                data = json.loads(data_str)
                
                if isinstance(data, dict) and 'type' in data:
                    if data['type'] == 'answer':
                        if 'content' in data:
                            content = data['content']
                            print(f"📤 提取到 answer 内容: {content[:100]}...")
                            return content
                    elif data['type'] == 'message':
                        if 'content' in data:
                            content = data['content']
                            print(f"📤 提取到 message 内容: {content[:100]}...")
                            return content
            except json.JSONDecodeError as e:
                print(f"⚠️ 解析单行 JSON 失败: {e}")
                continue
    
    return None


async def test_coze_api():
    print("=== 扣子（Coze）API 测试 ===")
    
    load_env()
    
    api_key = os.environ.get("COZE_API_KEY", "")
    project_id = os.environ.get("COZE_BOT_ID", "7641045972851851314")
    api_url = os.environ.get("COZE_URL", "https://3xqbzqjk5g.coze.site/stream_run")
    
    print(f"API Key: {api_key[:10]}..." if api_key else "API Key: 未设置")
    print(f"Project ID: {project_id}")
    print(f"API URL: {api_url}")
    print()

    if not api_key:
        print("❌ API Key 未设置，请在 .env 文件中配置 COZE_API_KEY")
        return False

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    prompt_text = """【初始场景】：同事甩来一口大锅：'那个客户投诉的问题是你负责的哦...' 
【我的反击】：'甩锅是吧？这锅太重我一个人背不动，建议把领导拉进来大家一起当柴烧。' 
请根据人设进行点评并生成下一关。"""

    payload = {
        "project_id": project_id,
        "content": {
            "query": {
                "prompt": [
                    {
                        "type": "text",
                        "content": {
                            "text": prompt_text
                        }
                    }
                ]
            },
            "type": "query"
        }
    }

    try:
        print("正在发送测试请求...")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(api_url, headers=headers, json=payload)
            
            print(f"\n✅ 请求发送成功！")
            print(f"HTTP 状态码: {response.status_code}")
            print(f"响应头: {dict(response.headers)}")
            print()
            
            response_text = response.text
            print("📋 原始响应内容:")
            print(response_text)
            print()
            
            try:
                print("🔍 尝试解析为 JSON...")
                result = response.json()
                print("✅ 响应是有效的 JSON")
                print(json.dumps(result, ensure_ascii=False, indent=2))
                
                if "data" in result:
                    data = result["data"]
                    if "content" in data:
                        content = data["content"]
                        print(f"\n🧹 清洗内容...")
                        cleaned = clean_json_output(str(content))
                        print(f"清洗后: {cleaned[:200]}...")
                        try:
                            final = json.loads(cleaned)
                            print(f"\n✅ 最终 JSON 解析成功！")
                            print(json.dumps(final, ensure_ascii=False, indent=2))
                        except json.JSONDecodeError as e:
                            print(f"❌ 最终 JSON 解析失败: {e}")
                            
            except json.JSONDecodeError:
                print("⚠️ 响应不是有效的 JSON，尝试解析流式格式...")
                
                content = parse_stream_response(response_text)
                if content:
                    print(f"\n🧹 清洗内容...")
                    cleaned = clean_json_output(str(content))
                    print(f"清洗后: {cleaned[:200]}...")
                    
                    try:
                        final = json.loads(cleaned)
                        print(f"\n✅ 最终 JSON 解析成功！")
                        print(json.dumps(final, ensure_ascii=False, indent=2))
                    except json.JSONDecodeError as e:
                        print(f"❌ 最终 JSON 解析失败: {e}")
                        print(f"原始内容: {cleaned}")
                else:
                    print("❌ 未能从流式响应中提取内容")
            
            return True
                
    except httpx.TimeoutException:
        print("❌ 请求超时！")
        return False
    except httpx.HTTPError as e:
        print(f"❌ HTTP 错误: {e}")
        return False
    except Exception as e:
        print(f"❌ 未知错误: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_coze_api())