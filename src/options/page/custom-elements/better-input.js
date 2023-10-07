class BetterInputElement extends HTMLElement {
  _type;
  _input;
  _previousValue;

  _input_inputListener;
  _input_blurListener;

  _opts = {
    min: null,
  };

  constructor() {
    super();

    this._type = this.getAttribute('type');

    if (this.hasAttribute('default')) {
      this._defaultPrevious[this._type] = this.getAttribute('default');
    }

    if (this.hasAttribute('min')) {
      this._opts.min = parseFloat(this.getAttribute('min'));
    }

    this._input = document.createElement('input');

    this._previousValue = this._defaultPrevious[this._type] ?? null;

    this.attachShadow({mode: 'closed'}).appendChild(this._input);
  }

  _setType(type) {
    this._type = type;

    if (this._input_inputListener != null) {
      this._input.removeEventListener('input', this._input_inputListener);
    }
    this._input_inputListener = () => (this._onChange[this._type] ?? this._onChange._base)(this._input.value);
    this._input.addEventListener('input', this._input_inputListener);

    if (this._input_blurListener != null) {
      this._input.removeEventListener('blur', this._input_blurListener);
    }
    this._input_blurListener = () => (this._onBlur[this._type] ?? this._onBlur._base)();
    this._input.addEventListener('blur', this._input_blurListener);

    this._input.value = this._defaultPrevious[this._type];
  }

  _defaultPrevious = {
    number: 0,
    string: '',
  };

  _typeCheck = {
    number: (value) => !isNaN(value) && !isNaN(parseFloat(value)),
  }

  _onChange = {
    _base: (value) => {
      this._previousValue = value;
      this._input.value = value;
      this.dispatchEvent(new Event('change'));
    },

    number: (value) => {
      if (value == null || value === '') {
        this._input.value = null;
        this._previousValue = null;
      } else if (this._typeCheck.number(value)) {
        value = parseFloat(value);
        this._input.value = value;
        this._previousValue = value;
        this.dispatchEvent(new Event('change'));
      } else {
        this._input.value = this._previousValue;
      }
    },
  }

  _onBlur = {
    _base: () => {},
    number: () => {
      let changed = false;

      if (this._input.value == null || this._input.value === '') {
        this._input.value = this._defaultPrevious.number;
        this._previousValue = this._input.value;
        changed = true;
      }

      const value = parseFloat(this._input.value);
      if (this._opts.min != null && value < this._opts.min) {
        this._input.value = this._opts.min;
        this._previousValue = this._input.value;
        changed = true;
      }

      if (changed) {
        this.dispatchEvent(new Event('change'));
      }
    },
  }

  get value() {
    const value = this._input.value;

    if (this._type === 'number') {
      return parseFloat(value);
    }

    return value;
  }

  set value(value) {
    (this._onChange[this._type] ?? this._onChange._base)(value ?? this._defaultPrevious[this._type] ?? null);
  }

  set type(value) {
    this._setType(value);
  }

  set placeholder(value) {
    this._input.placeholder = value;
  }
}

window.addEventListener('DOMContentLoaded', () => customElements.define('better-input', BetterInputElement));