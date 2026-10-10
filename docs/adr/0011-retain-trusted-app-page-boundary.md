# Retain the trusted app-page boundary

Status: accepted

Only the bundled AgentKib app page may call privileged Desktop API methods through the MyGo adapter. External pages, `file:` pages, and Web/LAN clients remain outside that boundary and continue to use their existing controlled services.
