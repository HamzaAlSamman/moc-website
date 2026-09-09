#!/bin/bash
# Move to the root directory of the next-app
cd "$(dirname "$0")/.." || exit 1

# Load .env variables dynamically
if [ -f .env ]; then
  # Read .env file line by line to support values containing spaces or special characters safely
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments and empty lines
    if [[ ! "$line" =~ ^# ]] && [[ "$line" =~ = ]]; then
      # Extract key and value
      key=$(echo "$line" | cut -d '=' -f 1 | xargs)
      val=$(echo "$line" | cut -d '=' -f 2- | xargs)
      # Remove surrounding quotes if present
      val="${val#\"}"
      val="${val%\"}"
      val="${val#\'}"
      val="${val%\'}"
      export "$key"="$val"
    fi
  done < .env
fi

if [ -z "$OUTBOX_CRON_SECRET" ]; then
  echo "Error: OUTBOX_CRON_SECRET is not configured in .env file."
  exit 1
fi

# Since the server might not resolve its own public domain due to Hairpin NAT or firewall
# configurations, we execute the request locally on localhost.
PORT_NUM=${PORT:-3000}

# Execute curl request
/usr/bin/curl -fsS -X POST -H "Authorization: Bearer $OUTBOX_CRON_SECRET" "http://localhost:$PORT_NUM/api/internal/process-notification-outbox"
