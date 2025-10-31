
export class RLConnection {
	private socket: WebSocket;

	constructor() {
		this.socket = this.makeSocket();
	}

	private makeSocket() {
		const socket = new WebSocket("wss://127.0.0.1:5577");
		socket.onopen = () => {
			console.log("[RL] WebSocket connected:", socket.url);
		};

		socket.onerror = (error) => {
			console.error("[RL] WebSocket error:", error);
			setTimeout(() => {
				this.socket = this.makeSocket();
			}, 500);
		};

		socket.onmessage = (event: MessageEvent) => {
			const raw = event.data;
			// Try to parse JSON, but fall back to raw text
			try {
				const parsed = JSON.parse(raw);
				console.log("[RL] Received <-", parsed);
			} catch {
				console.log("[RL] Received (raw) <-", raw);
			}
		};
		return socket;
	}

	public async send(data: unknown) {
		if (this.socket.readyState !== WebSocket.OPEN) {
			console.error("socket are not opened yet");
			return;
		}
		try {
			this.socket.send(JSON.stringify(data));
			console.log("[RL] Sent ->", data);
		} catch (err) {
			console.error("[RL] Failed to send message:", err);
		}
	};

	public stop() {
		this.socket.close();
	};
}
