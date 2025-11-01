
export class RLConnection {
	private socket: WebSocket;

	constructor() {
		this.socket = this.makeSocket();
	}

	private makeSocket() {
		const socket = new WebSocket("ws://127.0.0.1:5577");
		socket.onopen = () => {
			console.log("Info","RL: WebSocket connected");
		};

		socket.onerror = (error) => {
			console.error("Error","RL: " + error);
			setTimeout(() => {
				this.socket = this.makeSocket();
			}, 5000);
		};

		socket.onmessage = (event: MessageEvent) => {
			const raw = event.data;
			console.log(raw);
		};
		return socket;
	}

	public async send(data: any) {
		if (this.socket.readyState !== WebSocket.OPEN) {
			console.error("Error","socket are not opened yet");
			return;
		}
		try {
			let txt = JSON.stringify(data);
			this.socket.send(txt);
			console.log(txt);
		} catch (err) {
			console.error("Error","RL: Failed to send message: " + err);
		}
	};

	public stop() {
		this.socket.close();
	};
}
