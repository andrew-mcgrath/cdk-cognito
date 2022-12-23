def hello_handler(event, context): 
    return {
        "statusCode": 200,
        "headers": { "Content-Type": "text/plain" },
        "body": f"Hello, CDK! You've hit {event['path']}\n"
    }