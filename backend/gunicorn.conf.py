import json

bind = "0.0.0.0:8000"
workers = 3
accesslog = "-"
errorlog = "-"

# JSON access log format
access_log_format = (
    '{"remote":"%(h)s","method":"%(m)s","path":"%(U)s","query":"%(q)s",'
    '"status":%(s)s,"length":%(b)s,"referer":"%(f)s","agent":"%(a)s","request_time":%(L)s}'
)

