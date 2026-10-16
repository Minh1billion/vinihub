import PageBar from './PageBar.jsx'

export default function PageFrame({ title, ariaLabel, tabs, actions, aside, asideTitle, bodyRef, flush = false, className = '', children }) {
  return (
    <div className={'page ' + className}>
      <PageBar title={title} ariaLabel={ariaLabel} groups={tabs} actions={actions} />
      <div className={'page-body' + (aside ? ' page-body--aside' : '') + (flush ? ' page-body--flush' : '')} ref={bodyRef}>
        {aside ? (
          <>
            <section className="page-main">{children}</section>
            <aside className="page-aside">
              {asideTitle && <h2>{asideTitle}</h2>}
              {aside}
            </aside>
          </>
        ) : children}
      </div>
    </div>
  )
}
