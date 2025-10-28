from googleapiclient.discovery import build


GOOGLE_SEARCH_API_KEY = "AIzaSyB2lGUqRHA_JAlmRJdgEooV7sPdrG1qlF0"
GOOGLE_SEARCH_ENGINE_ID = "f15f639240c6941a1"

service = build("customsearch", "v1", developerKey=GOOGLE_SEARCH_API_KEY)
res = service.cse().list(q="test plagiarism checker text", cx=GOOGLE_SEARCH_ENGINE_ID, num=1).execute()
print(res)
