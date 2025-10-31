
export class RLConnection {
	private socket: WebSocket;
	private log: (title: string, msg: string) => void;

	constructor(log: (title: string, msg: string) => void) {
		this.socket = this.makeSocket();
		this.log = log;
	}

	private makeSocket() {
		const socket = new WebSocket("ws://127.0.0.1:5577");
		socket.onopen = () => {
			this.log("Info","RL: WebSocket connected");
		};

		socket.onerror = (error) => {
			this.log("Error","RL: " + error);
			setTimeout(() => {
				this.socket = this.makeSocket();
			}, 5000);
		};

		socket.onmessage = (event: MessageEvent) => {
			const raw = event.data;
			const parsed = JSON.parse(raw);
			this.log("Info",parsed.result.action);
		};
		return socket;
	}

	public async send(data: any) {
		if (this.socket.readyState !== WebSocket.OPEN) {
			this.log("Error","socket are not opened yet");
			return;
		}
		try {
			this.socket.send(JSON.stringify(data));
			console.log(`${data.index} ${data.data}`);
		} catch (err) {
			this.log("Error","RL: Failed to send message: " + err);
		}
	};

	public stop() {
		this.socket.close();
	};
}
