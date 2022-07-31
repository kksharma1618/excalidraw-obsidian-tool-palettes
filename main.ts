import { App, Modal, Notice, Plugin, SuggestModal } from "obsidian";

interface ISavedState {
	[tool: string]: {
		[palleteName: string]: unknown;
	};
}
const stateKeys = [
	"currentItemBackgroundColor",
	"currentItemEndArrowhead",
	"currentItemFillStyle",
	"currentItemFontFamily",
	"currentItemFontSize",
	"currentItemLinearStrokeSharpness",
	"currentItemOpacity",
	"currentItemRoughness",
	"currentItemStartArrowhead",
	"currentItemStrokeColor",
	"currentItemStrokeSharpness",
	"currentItemStrokeStyle",
	"currentItemStrokeWidth",
	"currentItemTextAlign",
];

const toolTypes = [
	"rectangle",
	"diamond",
	"ellipse",
	"arrow",
	"line",
	"freedraw",
	"text",
];

export default class ExcalidrawObsidianToolPalletesPlugin extends Plugin {
	state: ISavedState;

	async savePallete(name: string) {
		const { ep } = this.getExcalidraw();
		const tool = ep.getAppState().activeTool;
		if (!tool || !tool.type) {
			return;
		}

		const st = ep.getAppState();
		const styles: any = {};
		stateKeys.forEach((k) => {
			styles[k] = st[k];
		});

		this.state = {
			...(this.state || {}),
		};
		this.state[tool.type] = {
			...(this.state[tool.type] || {}),
		};
		this.state[tool.type][name] = styles;
		await this.saveState();
	}

	getExcalidraw() {
		const ea = (window as unknown as any).ExcalidrawAutomate;
		ea.reset();
		ea.setView("first");
		const ep = ea.getExcalidrawAPI();
		return { ea, ep };
	}

	async saveState() {
		await this.saveData(this.state);
	}
	async loadState() {
		this.state = Object.assign({}, {}, await this.loadData());
	}

	getCurrentToolType() {
		const { ep } = this.getExcalidraw();
		const tool = ep.getAppState().activeTool;
		if (!tool || !tool.type) {
			return "";
		}
		return tool.type;
	}
	getCurrentToolPalletes() {
		const t = this.getCurrentToolType();
		return this.state[t] ? Object.keys(this.state[t]) : [];
	}
	loadPallete(tool: string, name: string) {
		if (this.state[tool] && this.state[tool][name]) {
			const { ep } = this.getExcalidraw();
			ep.updateScene({
				appState: {
					...ep.getAppState(),
					...(this.state[tool][name] as any),
				},
			});
		}
	}
	async removePallete(tool: string, name: string) {
		if (this.state[tool] && this.state[tool][name]) {
			delete this.state[tool][name];
			await this.saveState();
		}
	}
	async onload() {
		await this.loadState();

		this.addCommand({
			id: "save-style",
			name: "Save style",
			callback: () => {
				this.saveCurrentToolPallete();
			},
		});

		this.addCommand({
			id: "load-style",
			name: "Load style",
			callback: () => {
				this.loadToolPallete();
			},
		});
	}

	saveCurrentToolPallete() {
		const tool = this.getCurrentToolType();
		if (!toolTypes.includes(tool)) {
			new Notice("No valid tool selected");
			return;
		}
		new SaveSuggestPalleteModal(this.app, this).open();
	}
	loadToolPallete() {
		const tool = this.getCurrentToolType();
		if (!toolTypes.includes(tool)) {
			new Notice("No valid tool selected");
			return;
		}

		new LoadPallete(this.app, this).open();
	}

	onunload() {}
}

class SaveSuggestPalleteModal extends SuggestModal<string> {
	constructor(
		app: App,
		private plugin: ExcalidrawObsidianToolPalletesPlugin
	) {
		super(app);
		this.setPlaceholder(
			"Provide name for the style. Or pick existing one to update"
		);
		this.inputListener = this.inputListener.bind(this);
	}
	getSuggestions(query: string): string[] {
		return this.plugin
			.getCurrentToolPalletes()
			.filter((p) => p.toLowerCase().includes(query.toLowerCase()));
	}

	// Renders each suggestion item.
	renderSuggestion(p: string, el: HTMLElement) {
		el.createEl("div", { text: p });
	}

	// Perform action on the selected suggestion.
	onChooseSuggestion(p: string, evt: MouseEvent | KeyboardEvent) {
		this.plugin.savePallete(p);
		this.close();
	}

	onOpen() {
		this.inputEl.addEventListener("keyup", this.inputListener);
	}

	onClose() {
		this.inputEl.removeEventListener("keyup", this.inputListener);
	}

	private inputListener(e: KeyboardEvent) {
		if (e.code === "Enter") {
			const p = this.inputEl.value.trim();
			if (p) {
				this.plugin.savePallete(p);
				this.close();
			}
		}
	}
}

export class LoadPallete extends Modal {
	constructor(
		app: App,
		private plugin: ExcalidrawObsidianToolPalletesPlugin
	) {
		super(app);
	}

	onOpen() {
		const tool = this.plugin.getCurrentToolType();

		if (!tool) {
			this.close();
			return;
		}
		const palletes = this.plugin.getCurrentToolPalletes();

		const { contentEl } = this;

		if (!palletes.length) {
			contentEl.setText("No styles found for " + tool + " tool");
			return;
		}
		contentEl.createEl("h3", { text: "Pick style for " + tool + " tool" });
		const ul = contentEl.createEl("ul");
		palletes.forEach((p) => {
			const li = ul.createEl("li");
			const a = li.createEl("a", { text: p });
			a.addEventListener("click", () => {
				this.plugin.loadPallete(tool, p);
				this.close();
			});
			li.createEl("span", { text: " " });

			const a2 = li.createEl("a", { text: "X", title: "Remove style" });
			a2.addEventListener("click", () => {
				this.plugin.removePallete(tool, p);
				li.remove();
			});
			a2.style.color = "red";
			a2.style.textDecoration = "none";
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
