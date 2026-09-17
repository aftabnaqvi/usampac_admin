export default function ListSearch({
  action,
  query,
  placeholder
}: {
  action: string;
  query: string;
  placeholder: string;
}) {
  return (
    <form method="get" action={action} className="formInline listSearch">
      <input name="q" defaultValue={query} placeholder={placeholder} />
      <button type="submit" className="btnPrimary">
        Search
      </button>
      {query ? (
        <a className="pill" href={action}>
          Clear
        </a>
      ) : null}
    </form>
  );
}
