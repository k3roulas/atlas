import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

interface SearchResult {
  id: string;
  name: string;
  address: {
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    street?: string;
  };
  location: { lat: number; lng: number };
}

@customElement('atlas-autocomplete')
export class AtlasAutocomplete extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .container {
      position: relative;
    }

    input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      margin-top: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      max-height: 300px;
      overflow-y: auto;
      z-index: 1000;
    }

    .result {
      padding: 10px 12px;
      cursor: pointer;
      border-bottom: 1px solid #f3f4f6;
    }

    .result:last-child {
      border-bottom: none;
    }

    .result:hover,
    .result.active {
      background: #f0f7ff;
    }

    .result-name {
      font-weight: 500;
      font-size: 14px;
    }

    .result-address {
      color: #6b7280;
      font-size: 12px;
      margin-top: 2px;
    }

    .loading,
    .empty {
      padding: 12px;
      text-align: center;
      color: #6b7280;
      font-size: 13px;
    }
  `;

  @property({ type: String }) apiKey = '';
  @property({ type: String }) placeholder = 'Search for an address...';
  @property({ type: String }) lang = 'en';
  @property({ type: Number }) limit = 5;
  @property({ type: String }) baseUrl = 'https://api.atlas.dev';

  @state() private _results: SearchResult[] = [];
  @state() private _loading = false;
  @state() private _open = false;
  @state() private _activeIndex = -1;

  @query('input') private _input!: HTMLInputElement;

  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;

  private get _apiUrl(): string {
    return this.baseUrl.replace(/\/$/, '');
  }

  render() {
    return html`
      <div class="container">
        <input
          type="text"
          .placeholder=${this.placeholder}
          .value=${this._input?.value ?? ''}
          @input=${this._onInput}
          @focus=${this._onFocus}
          @blur=${this._onBlur}
          @keydown=${this._onKeydown}
        />
        ${
          this._open
            ? html`
              <div class="dropdown">
                ${
                  this._loading
                    ? html`<div class="loading">Searching...</div>`
                    : this._results.length === 0
                      ? html`<div class="empty">No results found</div>`
                      : this._results.map(
                          (result, i) => html`
                          <div
                            class="result ${i === this._activeIndex ? 'active' : ''}"
                            @mousedown=${(e: Event) => {
                              e.preventDefault();
                              this._selectResult(result);
                            }}
                            @mouseenter=${() => {
                              this._activeIndex = i;
                            }}
                          >
                            <div class="result-name">${result.name}</div>
                            <div class="result-address">
                              ${[result.address.street, result.address.city, result.address.country]
                                .filter(Boolean)
                                .join(', ')}
                            </div>
                          </div>
                        `
                        )
                }
              </div>
            `
            : nothing
        }
      </div>
    `;
  }

  private _onInput() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);

    const query = this._input.value.trim();
    if (query.length < 2) {
      this._results = [];
      this._open = false;
      return;
    }

    this._debounceTimer = setTimeout(() => this._search(query), 300);
  }

  private _onFocus() {
    if (this._results.length > 0) {
      this._open = true;
    }
  }

  private _onBlur() {
    setTimeout(() => {
      this._open = false;
    }, 200);
  }

  private _onKeydown(e: KeyboardEvent) {
    if (!this._open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._activeIndex = Math.min(this._activeIndex + 1, this._results.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._activeIndex = Math.max(this._activeIndex - 1, 0);
    } else if (e.key === 'Enter' && this._activeIndex >= 0) {
      e.preventDefault();
      this._selectResult(this._results[this._activeIndex]);
    } else if (e.key === 'Escape') {
      this._open = false;
    }
  }

  private async _search(query: string) {
    this._loading = true;
    this._open = true;
    this._activeIndex = -1;

    try {
      const params = new URLSearchParams({
        query,
        limit: String(this.limit),
        lang: this.lang,
      });

      const res = await fetch(`${this._apiUrl}/v1/localities/autocomplete?${params}`, {
        headers: { 'X-API-Key': this.apiKey },
      });

      if (!res.ok) throw new Error('Search failed');

      const body = await res.json();
      this._results = body.data ?? [];
    } catch {
      this._results = [];
    } finally {
      this._loading = false;
    }
  }

  private _selectResult(result: SearchResult) {
    this._open = false;
    this._results = [];
    this._input.value = result.name;

    this.dispatchEvent(
      new CustomEvent('atlas:select', {
        detail: result,
        bubbles: true,
        composed: true,
      })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'atlas-autocomplete': AtlasAutocomplete;
  }
}
