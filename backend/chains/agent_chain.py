"""
Agent LangChain avec outils médicaux.
Capable de: calcul de dosages, interactions médicamenteuses, recherche PubMed.
"""
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from chains.rag_chain import get_llm
from tools.medical_tools import get_medical_tools

AGENT_SYSTEM_PROMPT = """Tu es MedAssist, un agent médical expert et évolué.
Tu as accès à des outils prédictifs et de recherche pour répondre avec une grande précision.

Utilise LES OUTILS DISPONIBLES dès que possible :
- Si l'utilisateur donne ses symptômes (fièvre, douleur, jours, âge, sexe) → utilise `_predict_diagnosis`
- S'il donne des facteurs de risque vitaux (tension, glucose, bmi, âge) → utilise `_predict_risk`
- S'il te demande d'ajuster une dose d'un médicament (nom, poids, âge, clairance/crcl) → utilise `_optimize_dosage`
- Pour un calcul de dosage pédiatrique/simple → `calcul_dosage`
- Pour vérifier des interactions médicamenteuses → `interactions_medicamenteuses`
- Pour chercher des études médicales sur PubMed → `recherche_pubmed`

IMPORTANT : Sois méthodique, appelle l'outil approprié, analyse son résultat (qui inclut des pourcentages de risque ou de confiance), et explique les résultats au patient de façon rassurante et professionnelle. Ne fais pas de diagnostic définitif.
"""


def build_agent():
    llm = get_llm()
    tools = get_medical_tools()

    prompt = ChatPromptTemplate.from_messages([
        ("system", AGENT_SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm, tools, prompt)
    return AgentExecutor(agent=agent, tools=tools, verbose=True, max_iterations=5)


def format_history(messages: list[dict]) -> list:
    history = []
    for msg in messages:
        if msg["role"] == "user":
            history.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            history.append(AIMessage(content=msg["content"]))
    return history
