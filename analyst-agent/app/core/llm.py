from langchain.llms.base import LLM
import google.generativeai as genai
from app.core.config import GEMINI_API_KEY, GEMINI_MODEL

genai.configure(api_key=GEMINI_API_KEY)

class GeminiLLM(LLM):
    @property
    def _llm_type(self) -> str:
        return "gemini"

    def _call(self, prompt: str, stop=None) -> str:
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(prompt)
        return response.text

def get_llm():
    return GeminiLLM()
