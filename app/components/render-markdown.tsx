export function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: number) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="list-disc list-inside space-y-1 my-2 pl-1">
          {listItems.map((item, j) => (
            <li key={j} className="text-sm text-gray-700 leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const renderInline = (line: string): React.ReactNode => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, j) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={j} className="font-semibold text-gray-800">
          {part.slice(2, -2)}
        </strong>
      ) : (
        part
      )
    );
  };

  lines.forEach((line, i) => {
    if (line.startsWith("# ")) {
      flushList(i);
      elements.push(
        <h1 key={i} className="text-2xl font-bold text-gray-900 mt-6 mb-3 first:mt-0">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      flushList(i);
      elements.push(
        <h2 key={i} className="text-base font-bold text-indigo-700 mt-5 mb-2 pb-1 border-b border-indigo-100">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      flushList(i);
      elements.push(
        <h3 key={i} className="text-sm font-semibold text-gray-800 mt-4 mb-1">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      listItems.push(line.slice(2));
    } else if (line.trim() === "") {
      flushList(i);
      elements.push(<div key={i} className="h-1" />);
    } else {
      flushList(i);
      elements.push(
        <p key={i} className="text-sm text-gray-700 leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
  });

  flushList(lines.length);
  return elements;
}
