export class FormSession {
  constructor(savedValue) {
    this.saved = structuredClone(savedValue);
    this.draft = structuredClone(savedValue);
  }
  update(mutator) { mutator(this.draft); return structuredClone(this.draft); }
  undo() { this.draft = structuredClone(this.saved); return structuredClone(this.draft); }
  cancel() { return structuredClone(this.saved); }
  markSaved(value = this.draft) { this.saved = structuredClone(value); this.draft = structuredClone(value); return structuredClone(this.saved); }
}
