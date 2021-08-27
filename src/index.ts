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
export type TreeData = string | [content: string, children: TreeData[]]

export interface TreeParams {
  /** The `id` value of the `Tree`'s root element. */
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

type OptionalParamKey = "id" | "baseFontSize"
// type OptionalParams = Pick<TreeParams,OptionalParamKey>
type RequiredParams = Omit<TreeParams,OptionalParamKey>
// type PartialParams = RequiredParams & Partial<OptionalParams>

const defaults = {
  indent: "10px",
  fontFamily: "monospace",
  fontWeight: "normal",
  fontSize: "12pt",
  expandedBullet: "-",
  collapsedBullet: "+",
  nodeClassName: "tree_node",
  nodeMarginBottom: "1px",
  nodePaddingRight: "4px",
  nodePaddingTop: "4px",
  nodePaddingBottom: "4px"
}

const compile = (html: string): HTMLElement => {
  const div = document.createElement("div")
  div.innerHTML = html
  return div.children[0] as HTMLElement
}
const treeNode = (params: Partial<TreeParams>) => (el: HTMLDivElement): TreeNode => {
  const childrenElement = el.querySelector(".children") as HTMLDivElement
  const textInputEl = el.querySelector(`.content > input[type="text"]`) as HTMLInputElement
  let children: TreeNode[]
  const setChildren = () => {
    children = [...childrenElement.children].map(treeNode (params) as any) as TreeNode[]
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
const genTreeNodeHtml = (params: Partial<TreeParams>) => (content: string, ...children: string[]) => {
  const parameters = Object.assign({}, defaults, params)
  return `
    <div class="${parameters.nodeClassName} expanded">
      <span class="content">
        <span class="collapsed bullet">${parameters.collapsedBullet}</span>
        <span class="expanded bullet">${parameters.expandedBullet}</span>
        <input type="text" value="${content}">
      </span>
      <div class="children expanded">
        ${children.join("")}
      </div>
    </div>
  `.replace(/\n\s*/g,"")
}
const treeDataToHtml = (params: Partial<TreeParams>) => (data: TreeData): string => {
  if (typeof data === "string") {
    return genTreeNodeHtml(params)(data)
  }
  else {
    const [content, children] = data
    return genTreeNodeHtml(params)(content, ...children.map(treeDataToHtml(params)))
  }
}

const generateStyleSheet = (params: RequiredParams) => `
  .tree > .${params.nodeClassName} {
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
  .children.collapsed {
    visibility: hidden;
    height: 0;
  }
  .children.collapsed * {
    visibility: hidden;
  }
  .bullet {
    user-select: none;
    cursor: pointer;
    padding-left: 0.2em;
    padding-right: 0.2em;
  }
  .bullet.expanded.leaf {
    color: rgba(0, 0, 0, 0.1);
    cursor: default;
  }
  .content {
    display: flex;
  }
  input[type="text"] {
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
const tree = (html: string, params: Partial<TreeParams>): Tree => {
  const parameters = Object.assign({}, defaults, params)
  const { indent, id } = parameters
  const style = [
    "<style>",
    generateStyleSheet(parameters),
    "</style>"
  ].join("\n")
  const openingTag = `<div class="tree"${id ? `id="${id}"` : ""}>`
  const outerHtml = (inner: string) => `${openingTag}${style}${inner}</div>`
  const el = compile(outerHtml(html)) as HTMLDivElement
  let root = treeNode (params) (el.querySelector(`.${parameters.nodeClassName}`) as HTMLDivElement)

  if (parameters.baseFontSize) root._el.style.fontSize = parameters.baseFontSize

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

export const createTree = (data: TreeData, params: Partial<TreeParams> = {}): Tree => {
  return tree(treeDataToHtml (params) (data), params)
}
/** Helper function to make writing out `TreeData` a bit easier. */
export const t = (content: string, ...children: TreeData[]): TreeData => {
  if (children.length === 0) return content
  else return [content, children]
}