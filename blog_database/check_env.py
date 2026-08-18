import dotenv, os
dotenv.load_dotenv()
key = os.environ.get('OPENAI_API_KEY', '')
print("Key:", key[:10] + "..." if key else "NOT FOUND")

# test connection
from openai import OpenAI
client = OpenAI()
try:
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "say ok"}],
        max_tokens=5
    )
    print("API OK:", resp.choices[0].message.content)
except Exception as e:
    print("API Error:", e)
