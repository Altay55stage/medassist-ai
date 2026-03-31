from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from config import get_settings
from typing import AsyncIterator
import os

settings = get_settings()

MEDICAL_SYSTEM_PROMPT = """Tu es MedAssist, un assistant médical expert et fiable.
Tu réponds aux questions des professionnels de santé.

Règles:
- Cite tes sources si tu as du contexte documentaire
- Ne fais jamais de diagnostic définitif
- Utilise un langage médical précis
- Réponds en français

{context}
"""


def get_llm():
    if settings.llm_provider == "openai":
        return ChatOpenAI(model=settings.openai_model, temperature=0.1, streaming=True)
    return ChatOllama(
        model=settings.ollama_model,
        base_url=settings.ollama_base_url,
        temperature=0.1,
    )


def build_rag_chain():
    llm = get_llm()
    index_path = settings.faiss_index_path

    # Si un index FAISS existe → mode RAG complet
    if os.path.exists(index_path):
        from vectorstore.indexer import load_vectorstore
        vectorstore = load_vectorstore()
        retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

        def format_docs(docs):
            parts = []
            for i, doc in enumerate(docs):
                source = doc.metadata.get("source", "Document inconnu")
                page = doc.metadata.get("page", "")
                parts.append(f"[{i+1}] {source}{f', p.{page}' if page else ''}\n{doc.page_content}")
            return "\n\n".join(parts)

        prompt = ChatPromptTemplate.from_messages([
            ("system", MEDICAL_SYSTEM_PROMPT),
            ("human", "{question}"),
        ])
        chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )
        return chain, retriever

    # Pas d'index → mode LLM direct (sans RAG)
    print("⚠️  Aucun index FAISS trouvé — mode LLM direct activé")
    prompt = ChatPromptTemplate.from_messages([
        ("system", MEDICAL_SYSTEM_PROMPT.replace("{context}", "")),
        ("human", "{question}"),
    ])
    chain = (
        {"question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    return chain, None


async def stream_rag_response(question: str, chain) -> AsyncIterator[str]:
    async for chunk in chain.astream(question):
        yield chunk
