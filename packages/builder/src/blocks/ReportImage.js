export function registerReportImage(editor) {
  editor.DomComponents.addType('report-image', {
    model: {
      defaults: {
        name: 'Report Image',
        droppable: false,
        resizable: { tl: 0, tc: 0, tr: 0, cl: 1, cr: 1, bl: 0, bc: 1, br: 1 },
        traits: [
          {
            type: 'text',
            name: 'variable',
            label: 'Variable name',
            placeholder: 'image_url',
            changeProp: true,
          },
        ],
        variable: 'image_url',
        style: { width: '200px', height: '120px', display: 'block' },
      },

      toHTML() {
        const variable = this.get('variable') || 'image_url'
        const style = this.getStyle()
        const styleStr = Object.entries(style)
          .map(([k, v]) => `${k}:${v}`)
          .join(';')
        return `<img src="{{${variable}}}" alt="" style="max-width:100%;display:block;${styleStr}">`
      },
    },

    view: {
      onRender() {
        if (!this._bound) {
          this.listenTo(this.model, 'change:variable', this.updatePlaceholder)
          this._bound = true
        }
        this.updatePlaceholder()
      },

      updatePlaceholder() {
        const variable = this.model.get('variable') || 'image_url'
        Object.assign(this.el.style, {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#e8eaf6',
          border: '2px dashed #9fa8da',
          color: '#5c6bc0',
          fontSize: '12px',
          fontFamily: 'sans-serif',
          boxSizing: 'border-box',
        })
        this.el.innerHTML = `<span style="pointer-events:none;text-align:center;line-height:1.8">
          🖼️<br><code style="font-size:11px">{{${variable}}}</code>
        </span>`
      },
    },
  })

  editor.Blocks.add('report-image', {
    label: 'Image',
    category: 'Report',
    content: { type: 'report-image' },
    attributes: { title: 'Image from a Handlebars variable' },
  })
}
