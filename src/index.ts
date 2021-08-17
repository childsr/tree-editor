export interface Tree {
  mount(parent: Element): void
  unmount(): void
  root: TreeNode
}
export interface TreeNode {
  content: string
  collapsed: boolean
  readonly children: TreeNode[]
  add(childHtml: string, index?: number): void
  remove(index: number): void
  _el: HTMLDivElement
}
export type TreeParams = {
  indent: string
  fontFamily: string
  fontWeight: string
  fontSize: string
  baseFontSize: string
  id: string
  collapsedBullet: string
  expandedBullet: string
}
export type TreeData = string | [content: string, children: TreeData[]]
 
const defaults: Partial<TreeParams> = {
  indent: "10px",
  fontFamily: "monospace",
  fontWeight: "normal",
  fontSize: "12pt",
  expandedBullet: "- ",
  collapsedBullet: "+ "
}

const compile = (html: string): HTMLElement => {
  const div = document.createElement("div")
  div.innerHTML = html
  return div.children[0] as HTMLElement
}
const treeNode = (el: HTMLDivElement): TreeNode => {
  const childrenElement = el.querySelector(".children") as HTMLDivElement
  const contentEl = el.querySelector(".content") as HTMLSpanElement
  let content = contentEl.innerText
  let children: TreeNode[]
  const setChildren = () => {
    children = [...childrenElement.children].map(treeNode as any) as TreeNode[]
  }
  setChildren()
  return {
    get content() { return content },
    set content(c) {
      content = c
      contentEl.innerText = content
    },
    get collapsed() { return childrenElement.classList.contains("collapsed") },
    set collapsed(c) {
      if (c) {
        childrenElement.classList.add("collapsed")
        el.classList.add("collapsed")
      }
      else {
        childrenElement.classList.remove("collapsed")
        el.classList.remove("collapsed")
      }
    },
    get children() { return children },
    add(childHtml: string, index = -1) {
      const childElement = compile(childHtml)
      if (index > -1 && index < childrenElement.childElementCount) {
        childrenElement.children[index].before(childElement)
      }
      else {
        childrenElement.append(childElement)
      }
      setChildren()
      addListeners(this)
    },
    remove(index: number) {
      if (index < 0 || index >= childrenElement.childElementCount) return
      else {
        const child = childrenElement.children[index]
        childrenElement.removeChild(child)
        setChildren()
        addListeners(this)
      }
    },
    _el: el
  }
}
const addListeners = (root: TreeNode) => {
  const children = root.children
  const bullets = [...root._el.children].slice(0,2)
  for (const bullet of bullets) {
    if (children.length > 0) {
      (bullet as HTMLSpanElement).onclick = () => { root.collapsed = !root.collapsed }
    }
    else {
      (bullet as HTMLSpanElement).onclick = null
    }
  }
  for (const child of children) addListeners(child)
  return root
}

const createTreeNodeHtml = (params: Partial<TreeParams>) => (data: TreeData): string => {
  if (typeof data === "string") {
    return treeNodeHtml(params)(data)
  }
  else {
    const [content, children] = data
    return treeNodeHtml(params)(content, ...children.map(createTreeNodeHtml(params)))
  }
}
const treeNodeHtml = (params: Partial<TreeParams>) => (content: string, ...children: string[]) => {
  const parameters = Object.assign({}, defaults, params)
  return `
    <div class="tree_node">
      <span class="collapsed bullet">${parameters.collapsedBullet}</span>
      <span class="expanded bullet">${parameters.expandedBullet}</span>
      <span class="content">${content}</span>
      <div class="children">
          ${children.join("")}
      </div>
    </div>
  `.replace(/\n\s*/g,"")
}
const tree = (html: string, params: Partial<TreeParams> = {}): Tree => {
  const parameters = Object.assign({}, defaults, params)
  const { indent, id } = parameters
  const style = `
    <style>
      .tree_node {
        margin-left: ${indent};
        padding-right: ${indent};
        padding-top: 0.2em;
        padding-bottom: 0.2em;
        font-family: ${parameters.fontFamily};
        font-size: ${parameters.fontSize};
        font-weight: ${parameters.fontWeight};
      }
      .collapsed.bullet {
        visibility: hidden;
        font-size: 0;
        width: 0;
      }
      .expanded.bullet {
        visibility: visible;
        width: initial;
        font-size: inherit;
      }
      .tree_node.collapsed > .collapsed.bullet {
        visibility: inherit;
        width: initial;
        font-size: inherit;
      }
      .tree_node.collapsed > .expanded.bullet {
        visibility: hidden;
        font-size: 0;
        width: 0;
      }
      .children.collapsed { visibility: hidden; height: 0; }
      .children.collapsed * { visibility: hidden; }
    </style>
  `
  const openingTag = `<div class="tree"${id ? `id="${id}"` : ""}>`
  const el = compile(`${openingTag}${style}${html}</div>`)
  const root = treeNode(el.querySelector(".tree_node") as HTMLDivElement)

  if (parameters.baseFontSize) root._el.style.fontSize = parameters.baseFontSize

  addListeners(root)

  return {
    mount(parent: Element) {
      parent.append(el)
    },
    unmount() {
      el.remove()
    },
    root
  }
}
const nodeToTreeData = (node: TreeNode): TreeData =>  {
  const { content, children } = node
  if (children.length > 0) return [content, children.map(nodeToTreeData)]
  else return content
}

export const toTreeData = (tree: Tree): TreeData => nodeToTreeData(tree.root)
export const createTree = (data: TreeData, params: Partial<TreeParams>): Tree => {
  return tree(createTreeNodeHtml (params) (data), params)
}
export const treeData = (content: string, ...children: TreeData[]): TreeData => {
  if (children.length === 0) return content
  else return [content, children]
}