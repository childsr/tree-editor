export interface Tree {
  readonly root: TreeNode
  setRoot(newRoot: TreeNode): void
  mount(parent: Element): void
  unmount(): void
  readonly _el: HTMLDivElement
}
export interface TreeNode {
  /** The text/html content of this node. */
  content: string
  /** Whether this node's children are visible or collapsed. */
  collapsed: boolean
  readonly children: TreeNode[]
  /**
   * Add a new child to this node. Optionally provide the `position`
   * where the child will be added
   * (e.g. `0` to be inserted at the top, `1` to be inserted
   * immediately after the current top child, etc.)
   * 
   * By default, the new child will be added to the end/bottom.
   * */
  add(childData: TreeData, position?: number): void
  /** Remove the child located at `index` from this node. */
  remove(index: number): void
  /** Get the `TreeData` object for this node and its descendents. */
  getTreeData(): TreeData
  readonly _el: HTMLDivElement
}
export type TreeDataBranch = [content: string, children: TreeData[]]
export type TreeData = string | TreeDataBranch

export interface TreeParams {
  /**
   * The `id` value of the `Tree`'s root element.
   * */
  id: string
  /**
   * The className to be given to each `TreeNode` element.
   * 
   * default: `"tree_node"`
   * */
  nodeClassName: string
  
  /**
   * How much each line is indented relative to its parent. (CSS value)
   * 
   * default: `"10px"`
   * */
  indent: string
  /**
   * default: `"monospace"`
   * */
  fontFamily: string
  /**
   * default: `"normal"`
   * */
  fontWeight: string
  /**
   * CSS Length
   * 
   * default: `"12pt"`
   * */
  fontSize: string
  /**
   * CSS Length
   * */
  baseFontSize: string
  /**
   * CSS Length
   *
   * default: `"1px"`
   * */
  nodeMarginBottom: string
  /**
   * CSS Length
   * 
   * default: `"4px"`
   * */
  nodePaddingRight: string
  /**
   * CSS Length
   * 
   * default: `"4px"`
   * */
  nodePaddingTop: string
  /**
   * CSS Length
   * 
   * default: `"4px"`
   * */
  nodePaddingBottom: string

  /**
   * The string that will be used as the bullet point on collapsed nodes (can be html).
   * 
   * default: "+"
   * */
  collapsedBullet: string
  /**
   * The string that will be used as the bullet point on expanded nodes (can be html).
   * 
   * default: "-"
   * */
  expandedBullet: string
}

const isTreeData = (x: any): x is TreeData => typeof x === "string" || isTreeDataBranch(x)
const isTreeDataBranch = (x: any): x is TreeDataBranch => {
  return (
    Array.isArray(x) &&
    x.length === 2 &&
    typeof x[0] === "string" &&
    Array.isArray(x[1]) &&
    x[1].every(isTreeData)
  )
}

const MOD_KEYS = ["altKey", "ctrlKey", "metaKey", "shiftKey"] as const
const modKeys = (e: KeyboardEvent) => {
  let value = 0
  for (let i = 0; i < MOD_KEYS.length; i++) {
    if (e[MOD_KEYS[i]]) value += Math.pow(2, i)
  }
  return value
}

const defaults: TreeParams = {
  id: "",
  indent: "10px",
  fontFamily: "monospace",
  fontWeight: "normal",
  fontSize: "12pt",
  baseFontSize: "",
  expandedBullet: "-",
  collapsedBullet: "+",
  nodeClassName: "tree_node",
  nodeMarginBottom: "1px",
  nodePaddingRight: "4px",
  nodePaddingTop: "4px",
  nodePaddingBottom: "4px"
}
const applyDefaults = (params: Partial<TreeParams>): TreeParams => Object.assign({}, defaults, params)

const compile = (html: string): HTMLElement => {
  const div = document.createElement("div")
  div.innerHTML = html
  return div.children[0] as HTMLElement
}
const createTreeNode = (params: TreeParams, el: HTMLDivElement): TreeNode => {
  const childrenElement = el.querySelector(".children") as HTMLDivElement
  const textInputEl = el.querySelector(`.content > input[type="text"]`) as HTMLInputElement
  let children: TreeNode[]
  const setChildren = () => {
    children = [...childrenElement.children].map(child => createTreeNode (params, child as HTMLDivElement)) as TreeNode[]
    if (children.length === 0) {
      el.querySelector(".expanded.bullet")?.classList.add("leaf")
    }
    else {
      el.querySelector(".expanded.bullet")?.classList.remove("leaf")
    }
  }
  setChildren()
  return {
    get content() { return textInputEl.value },
    set content(c) { textInputEl.value = c },
    get collapsed() { return childrenElement.classList.contains("collapsed") },
    set collapsed(c) {
      if (c) {
        childrenElement.classList.add("collapsed")
        el.classList.add("collapsed")
        childrenElement.classList.remove("expanded")
        el.classList.remove("expanded")
      }
      else {
        childrenElement.classList.remove("collapsed")
        el.classList.remove("collapsed")
        childrenElement.classList.add("expanded")
        el.classList.add("expanded")
      }
    },
    get children() { return children },
    add(childData: TreeData, index = -1) {
      const childElement = compile(treeDataToHtml (params) (childData))
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
        const childElement = childrenElement.children[index]
        childrenElement.removeChild(childElement)
        removeListeners(children[index])
        setChildren()
        addListeners(this)
      }
    },
    getTreeData() { return treeNodeToTreeData(this) },
    _el: el
  }
}
/** If `root` is not a leaf node, add listener callbacks to it and to all its non-leaf descendents. */
const addListeners = (root: TreeNode) => {
  const children = root.children
  const content = root._el.children[0]
  const bullets = [...content.children].slice(0,2)
  if (children.length > 0) {
    root._el.onkeydown = e => {
      const mod = modKeys(e)
      if (mod === 2) {
        if (e.code === "ArrowDown") {
          root.collapsed = false
          e.stopPropagation()
        }
        if (e.code === "ArrowUp") {
          root.collapsed = true
          e.stopPropagation()
        }
      }
    }
  }
  else {
    root._el.onkeydown = null
  }
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
/** Remove listener callbacks from `root` and all of its descendents. */
const removeListeners = (root: TreeNode) => {
  const children = root.children
  const content = root._el.children[0]
  const bullets = [...content.children].slice(2)
  root._el.onkeydown = null
  for (const bullet of bullets) {
    (bullet as HTMLSpanElement).onclick = null
  }
  for (const child of children) removeListeners(child)
  return root
}

const treeNodeToTreeData = (node: TreeNode): TreeData => {
  const { content, children } = node
  if (children.length > 0) return [content, children.map(treeNodeToTreeData)]
  else return content
}
const genTreeNodeHtml = (params: TreeParams) => (content: string, ...children: string[]) => {
  const parameters = applyDefaults(params)
  return `
    <div class="${parameters.nodeClassName} expanded">
      <span class="content">
        <span class="collapsed bullet">${parameters.collapsedBullet}</span>
        <span class="expanded bullet">${parameters.expandedBullet}</span>
        <input type="text"${content ? ` value="${content}"` : ""}>
      </span>
      <div class="children expanded">
        ${children.join("")}
      </div>
    </div>
  `.replace(/\n\s*/g,"")
}
const treeDataToHtml = (params: TreeParams) => (data: TreeData): string => {
  if (typeof data === "string") {
    return genTreeNodeHtml(params)(data)
  }
  else {
    const [content, children] = data
    return genTreeNodeHtml(params)(content, ...children.map(treeDataToHtml(params)))
  }
}

const generateStyleSheet = (params: TreeParams) => `
  ${params.id ? `#${params.id}` : ""}.tree > .${params.nodeClassName} {
    margin-left: 0;
    border-radius: 0;
  }
  .${params.nodeClassName} {
    margin-left: ${params.indent};
    margin-bottom: ${params.nodeMarginBottom};
    padding-right: ${params.nodePaddingRight};
    padding-top: ${params.nodePaddingTop};
    padding-bottom: ${params.nodePaddingBottom};
    font-family: ${params.fontFamily};
    font-size: ${params.fontSize};
    font-weight: ${params.fontWeight};
  }
  .${params.nodeClassName} > .content > .collapsed.bullet {
    visibility: hidden;
    font-size: 0;
    width: 0;
  }
  .${params.nodeClassName} > .content > .expanded.bullet {
    visibility: visible;
    width: initial;
    font-size: inherit;
  }
  .${params.nodeClassName}.collapsed > .content > .collapsed.bullet {
    visibility: inherit;
    width: initial;
    font-size: inherit;
  }
  .${params.nodeClassName}.collapsed > .content > .expanded.bullet {
    visibility: hidden;
    font-size: 0;
    width: 0;
  }
  .${params.nodeClassName} > .children.collapsed {
    visibility: hidden;
    height: 0;
  }
  .${params.nodeClassName} > .children.collapsed * {
    visibility: hidden;
  }
  .${params.nodeClassName} > .children.collapsed .expanded.bullet {
    visibility: hidden;
  }
  .${params.nodeClassName} > .content > .bullet {
    user-select: none;
    cursor: pointer;
    padding-left: 0.2em;
    padding-right: 0.2em;
  }
  .${params.nodeClassName} > .content > .bullet.expanded.leaf {
    color: rgba(0, 0, 0, 0.1);
    cursor: default;
  }
  .${params.nodeClassName} > .content {
    display: flex;
  }
  .${params.nodeClassName} > .content > input[type="text"] {
    flex: auto;
    outline: none;
    background: transparent;
    border: none;
    font-family: inherit;
    font-size: inherit;
  }
`.trim()

/** Ensure all child html elements have been appended to their parent elements. */
const appendAll = (node: TreeNode) => {
  const { children, _el } = node
  if (children.length === 0) return
  const parent = _el.querySelector(".children") as HTMLDivElement
  if (parent.childElementCount < children.length) {
    for (const childElement of parent.children) {
      childElement.remove()
    }
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      parent.append(child._el)
    }
  }
  for (const child of children) {
    appendAll (child)
  }
}
const tree = (data: TreeData, params: TreeParams): Tree => {
  const html = treeDataToHtml (params) (data)
  const style = [
    "<style>",
    generateStyleSheet(params),
    "</style>"
  ].join("\n")
  const openingTag = `<div class="tree"${params.id ? ` id="${params.id}"` : ""}>`
  const outerHtml = (inner: string) => `${openingTag}${style}${inner}</div>`
  const el = compile(outerHtml(html)) as HTMLDivElement
  let root = createTreeNode (params, el.querySelector(`.${params.nodeClassName}`) as HTMLDivElement)

  if (params.baseFontSize) root._el.style.fontSize = params.baseFontSize

  let mounted = false
  
  return {
    mount(parent: Element) {
      if (!mounted) {
        mounted = true
        parent.append(el)
        addListeners(root)
      }
    },
    unmount() {
      if (mounted) {
        mounted = false
        el.remove()
        removeListeners(root)
      }
    },
    setRoot(newRoot: TreeNode) {
      removeListeners(root)
      root._el.remove()
      root = newRoot
      el.append(newRoot._el)
      appendAll(newRoot)
      addListeners(newRoot)
    },
    get root() { return root },
    _el: el
  }
}

interface CreateTree {
  (data: TreeData, params?: Partial<TreeParams>): Tree
  (params?: Partial<TreeParams>): Tree
}

export const createTree: CreateTree = (data, params = {}) => (
  isTreeData(data)
    ? tree(data, applyDefaults(params as any))
    : tree("", applyDefaults(data ?? {}))
)

/** Helper function to make writing out `TreeData` a bit easier. */
export const t = (content: string, ...children: TreeData[]): TreeData => {
  if (children.length === 0) return content
  else return [content, children]
}