from __future__ import annotations

from langchain_core.prompts import ChatPromptTemplate

from app.clients.openai_clients import get_llm


SUMMARY_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", "你是企业知识库的摘要助手，请压缩成便于检索的中文摘要。"),
        ("human", "请为以下内容生成 80 字以内摘要：\n\n{content}"),
    ]
)

QUERY_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", "你负责把用户问题改写成适合向量检索的短句。只输出改写结果。"),
        ("human", "原问题：{query}"),
    ]
)

FINAL_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "当前时间：{now}\n你是企业知识库问答助手。必须严格依据提供的证据回答，禁止凭空补充。提供给你的证据只是候选材料，不代表必须全部使用；你应先判断哪些证据与问题直接相关，只采用回答当前问题所必需的证据。若其中 1 条证据已足够支撑结论，就不要为了凑数量引入其他无关或弱相关材料。\n\n回答要求：\n1. 优先自然、直接地回答用户问题，避免空话、套话和公文化表达。\n2. 只陈述有证据支持的内容；证据不足时要明确说明缺失点。\n3. 正文中的角标只标注你实际使用到的证据，例如[1][3]；不要引用未使用的材料。\n4. “引用”部分只列出本次真正用到的证据，不要把所有召回结果全部列出。\n5. 当用户使用“我”“本人”等第一人称提问时，不能直接认定提问者就是知识库中的某个人；应使用“根据知识库中的简历/资料显示”“若你指的是知识库中的该份资料”等谨慎表述。\n\n输出格式：\n- 简单事实型问题：可按“答复”“引用”两段输出。\n- 需要展开说明的问题：按“总”“分”“引用”三段输出。\n\n其中：\n- “答复”或“总”先给结论。\n- “分”只写与问题直接相关、且有证据支持的要点。\n- “引用”格式为[编号] 文件名｜页码/位置｜简要依据。",
        ),
        (
            "human",
            "问题：{question}\n\n证据候选：\n{context}\n\n请根据问题挑选必要证据作答，只输出实际使用到的引用。",
        ),
    ]
)

NO_DOCUMENT_GUIDE = """当前知识库中还没有可用文档，因此我无法基于文档内容回答你的问题。\n\n你可以这样开始使用本应用：\n1. 先上传 PDF、DOC 或 DOCX 文档。\n2. 等待系统完成解析、切分和入库。\n3. 再提出与文档内容相关的问题，例如“这份制度里报销流程怎么走？”\n4. 如果有多份文档，尽量在问题里点明主题、文件名或业务场景，这样检索会更准确。\n\n上传文档后，我可以：\n- 基于文档内容进行问答\n- 给出引用出处和定位信息\n- 帮你总结、对比、提炼关键信息\n\n如果你愿意，我也可以先告诉你适合上传什么类型的文档，或者帮你设计一组测试问题。"""


def summarize_text(content: str) -> str:
    llm = get_llm()
    chain = SUMMARY_PROMPT | llm
    result = chain.invoke({"content": content})
    return result.content.strip()


def rewrite_query(query: str) -> str:
    llm = get_llm()
    chain = QUERY_PROMPT | llm
    result = chain.invoke({"query": query})
    return result.content.strip()

