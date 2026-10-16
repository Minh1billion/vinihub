import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from '@/shared/ui/Icon.jsx'
import { intlLocale } from '@/shared/i18n/index.js'
import Caption from './Caption.jsx'
import Device from './Device.jsx'
import PlatformLogo from '../PlatformLogo.jsx'
import { Carousel, Clip, Empty } from './Media.jsx'
import { HASHTAG, clamp, layoutOf, ratioOf, rulesFor } from '../../utils/platforms.js'

const compact = (value) => new Intl.NumberFormat(intlLocale(), { notation: 'compact', maximumFractionDigits: 1 }).format(value)

function Avatar({ post, size = 36 }) {
  const style = { width: size, height: size, fontSize: size * 0.42 }
  if (post.avatar) return <img className="sim-av" style={style} src={post.avatar} alt="" referrerPolicy="no-referrer" />
  return <span className="sim-av" style={style}>{(post.name || post.handle || '?').trim().charAt(0).toUpperCase()}</span>
}

const VARIANT = { tiktok: 'tiktok', instagram: 'reel', facebook: 'fbreel', youtube: 'shorts' }

function Vertical({ post, variant, fold }) {
  const { t } = useTranslation()
  const is = (...list) => list.includes(variant)
  const shown = is('shorts') ? post.title : post.caption
  return (
    <div className="sim-vert">
      <Carousel media={post.media} className="sim-fill" />
      <div className="sim-shade" />
      <header className="sim-vert-top">
        {is('tiktok') && <><PlatformLogo platform="tiktok" size={22} /><span>{t('sim.tt.following')}</span><b>{t('sim.tt.forYou')}</b><Icon name="search" size={20} /></>}
        {is('reel', 'fbreel') && <><PlatformLogo platform={is('reel') ? 'instagram' : 'facebook'} size={22} /><b>{t('sim.ig.reels')}</b><Icon name={is('reel') ? 'dots' : 'search'} size={20} /></>}
        {is('shorts') && <><PlatformLogo platform="youtube" size={24} /><b>{t('sim.yt.shorts')}</b><Icon name="search" size={20} /></>}
      </header>
      <aside className="sim-rail">
        {is('tiktok') && <span className="sim-rail-av"><Avatar post={post} size={44} /><i><Icon name="plus" size={12} /></i></span>}
        {is('tiktok', 'reel') && <span><Icon name="heart" size={30} /><small>{compact(124500)}</small></span>}
        {is('fbreel', 'shorts') && <span><Icon name="thumb" size={28} /><small>{is('shorts') ? compact(124500) : t('sim.fb.like')}</small></span>}
        {is('shorts') && <span className="sim-flip"><Icon name="thumb" size={28} /><small>{t('sim.yt.dislike')}</small></span>}
        <span><Icon name="message" size={28} /><small>{compact(1820)}</small></span>
        {is('tiktok') && <span><Icon name="bookmark" size={28} /><small>{compact(9420)}</small></span>}
        <span><Icon name={is('reel') ? 'send' : 'share'} size={28} /><small>{is('fbreel', 'shorts') ? t('sim.fb.share') : compact(3310)}</small></span>
        {is('shorts') && <span><Icon name="repeat" size={28} /><small>{t('sim.yt.remix')}</small></span>}
        {is('reel', 'fbreel', 'shorts') && <span><Icon name="dots" size={24} /></span>}
        {is('tiktok') && <span className="sim-disc"><Avatar post={post} size={26} /></span>}
      </aside>
      <div className="sim-vert-info">
        {is('tiktok')
          ? <strong>@{post.handle}</strong>
          : (
            <div className="sim-reel-user">
              <Avatar post={post} size={28} />
              <strong>{is('shorts') ? `@${post.handle}` : is('fbreel') ? post.name || post.handle : post.handle}</strong>
              <em className={is('shorts') ? 'fill' : ''}>{is('shorts') ? t('sim.yt.subscribe') : t('sim.ig.follow')}</em>
            </div>
          )}
        <Caption text={shown} fold={fold} more={t('sim.more')} empty={is('shorts') ? t('sim.titleEmpty') : t('sim.captionEmpty')} className="sim-clamp" />
        {is('tiktok', 'reel') && (
          <div className="sim-music"><Icon name="music" size={14} /><span>{is('tiktok') ? t('sim.tt.sound', { name: post.name || post.handle }) : t('sim.ig.audio', { name: post.name || post.handle })}</span></div>
        )}
      </div>
      {is('tiktok') && (
        <footer className="sim-tabbar">
          <b>{t('sim.tt.home')}</b><span>{t('sim.tt.friends')}</span>
          <span className="sim-tab-plus"><Icon name="plus" size={18} /></span>
          <span>{t('sim.tt.inbox')}</span><span>{t('sim.tt.profile')}</span>
        </footer>
      )}
    </div>
  )
}

function Story({ post }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const count = Math.max(post.media.length, 1)
  const at = Math.min(index, count - 1)
  const item = post.media[at]
  return (
    <div className="sim-vert">
      <div className="sim-media sim-fill">{item ? <Clip key={item.id} item={item} /> : <Empty />}</div>
      <div className="sim-shade" />
      {post.media.length > 1 && (
        <>
          <button type="button" className="sim-tap prev" aria-label={t('sim.prev')} onClick={() => setIndex(Math.max(at - 1, 0))} />
          <button type="button" className="sim-tap next" aria-label={t('sim.next')} onClick={() => setIndex(Math.min(at + 1, count - 1))} />
        </>
      )}
      <header className="sim-story-top">
        <div className="sim-bars" aria-hidden="true">{Array.from({ length: count }, (_, i) => <i key={i} className={i < at ? 'done' : i === at ? 'now' : ''} />)}</div>
        <div className="sim-story-user">
          <Avatar post={post} size={32} />
          <strong>{post.handle}</strong>
          <small>{t('sim.story.time')}</small>
          <span className="sim-grow" />
          <Icon name="dots" size={20} /><Icon name="close" size={20} />
        </div>
      </header>
      {post.caption.trim() && <div className="sim-story-text"><Caption text={post.caption} fold={100000} more="" empty="" /></div>}
      <footer className="sim-story-foot">
        <span className="sim-reply">{t('sim.story.reply')}</span>
        <Icon name="heart" size={26} /><Icon name="send" size={26} />
      </footer>
    </div>
  )
}

function Instagram({ post, fold }) {
  const { t } = useTranslation()
  const ratio = clamp(ratioOf(post.media[0]) ?? 1, 0.8, 1.91)
  return (
    <div className="sim-feed">
      <div className="sim-topbar sim-ig-top"><b><PlatformLogo platform="instagram" size={24} />Instagram</b><span><Icon name="heart" size={22} /><Icon name="send" size={22} /></span></div>
      <div className="sim-col">
        <header className="sim-post-head">
          <span className="sim-ring"><Avatar post={post} size={30} /></span>
          <strong className="sim-grow">{post.handle}</strong>
          <Icon name="dots" size={20} />
        </header>
        <Carousel media={post.media} ratio={ratio} counter />
        <div className="sim-ig-actions">
          <Icon name="heart" size={24} /><Icon name="message" size={24} /><Icon name="send" size={24} />
          <span className="sim-grow" /><Icon name="bookmark" size={24} />
        </div>
        <div className="sim-pad">
          <p className="sim-strong">{t('sim.ig.likes', { value: compact(1284) })}</p>
          <Caption text={post.caption} fold={fold} more={t('sim.more')} empty={t('sim.captionEmpty')} lead={<b>{post.handle} </b>} />
          <p className="sim-mute">{t('sim.ig.comments', { value: 48 })}</p>
          <small className="sim-time">{t('sim.ig.time')}</small>
        </div>
      </div>
    </div>
  )
}

function Facebook({ post, fold }) {
  const { t } = useTranslation()
  const ratio = clamp(ratioOf(post.media[0]) ?? 1, 0.8, 1.91)
  return (
    <div className="sim-feed">
      <div className="sim-topbar sim-fb-top"><b><PlatformLogo platform="facebook" size={24} />facebook</b><span><Icon name="search" size={20} /><Icon name="message" size={20} /></span></div>
      <div className="sim-col">
        <article className="sim-card">
          <header className="sim-post-head">
            <Avatar post={post} size={40} />
            <div className="sim-grow"><strong>{post.name || post.handle}</strong><small>{t('sim.fb.time')} · <Icon name="globe" size={12} /></small></div>
            <Icon name="dots" size={20} />
          </header>
          <div className="sim-pad"><Caption text={post.caption} fold={fold} more={t('sim.fb.more')} empty={t('sim.captionEmpty')} className="sim-fb-text" /></div>
          {post.media.length > 0 && <Carousel media={post.media} ratio={ratio} counter />}
          <div className="sim-fb-stats">
            <span className="sim-react"><i className="blue"><Icon name="thumb" size={10} /></i><i className="red"><Icon name="heart" size={10} /></i>{compact(1240)}</span>
            <span>{t('sim.fb.stats', { comments: compact(48), shares: compact(12) })}</span>
          </div>
          <div className="sim-fb-actions">
            <span><Icon name="thumb" size={18} />{t('sim.fb.like')}</span>
            <span><Icon name="message" size={18} />{t('sim.fb.comment')}</span>
            <span><Icon name="share" size={18} />{t('sim.fb.share')}</span>
          </div>
        </article>
      </div>
    </div>
  )
}

function Threads({ post, fold }) {
  const { t } = useTranslation()
  return (
    <div className="sim-feed">
      <div className="sim-topbar sim-th-top"><b><PlatformLogo platform="threads" size={24} />Threads</b></div>
      <div className="sim-col">
        <article className="sim-th-post">
          <div className="sim-th-side"><Avatar post={post} size={36} /><i /></div>
          <div className="sim-th-main">
            <header><strong>{post.handle}</strong><small>{t('sim.th.time')}</small><span className="sim-grow" /><Icon name="dots" size={18} /></header>
            <Caption text={post.caption} fold={fold} more={t('sim.more')} empty={t('sim.captionEmpty')} />
            {post.media.length > 0 && (
              <div className="sim-th-strip">
                {post.media.map((m) => (
                  <div key={m.id} className="sim-th-item" style={{ aspectRatio: clamp(ratioOf(m) ?? 0.8, 0.7, 1.5) }}><Clip item={m} /></div>
                ))}
              </div>
            )}
            <div className="sim-th-actions"><Icon name="heart" size={20} /><Icon name="message" size={20} /><Icon name="repeat" size={20} /><Icon name="send" size={20} /></div>
            <small className="sim-mute">{t('sim.th.stats', { replies: compact(48), likes: compact(1284) })}</small>
          </div>
        </article>
      </div>
    </div>
  )
}

function Watch({ post, fold }) {
  const { t } = useTranslation()
  const tags = (post.caption.match(HASHTAG) || []).slice(0, 3)
  return (
    <div className="sim-feed sim-yt">
      <div className="sim-topbar sim-yt-top">
        <b className="sim-yt-logo"><PlatformLogo platform="youtube" size={28} />YouTube</b>
        <span className="sim-yt-search"><Icon name="search" size={16} />{t('sim.yt.search')}</span>
        <span><Icon name="search" size={20} /><Icon name="dots" size={20} /></span>
      </div>
      <div className="sim-yt-grid">
        <div className="sim-yt-main">
          <Carousel media={post.media.slice(0, 1)} ratio={16 / 9} className="sim-yt-player" />
          <div className="sim-yt-info">
            {tags.length > 0 && <p className="sim-yt-tags">{tags.join(' ')}</p>}
            <h3 className="sim-yt-title">{post.title.trim() || <span className="sim-ghost">{t('sim.titleEmpty')}</span>}</h3>
            <div className="sim-yt-chan">
              <Avatar post={post} size={36} />
              <div className="sim-grow"><strong>{post.name || post.handle}</strong><small>{t('sim.yt.subs', { value: compact(25400) })}</small></div>
              <span className="sim-yt-sub">{t('sim.yt.subscribe')}</span>
            </div>
            <div className="sim-yt-actions">
              <span><Icon name="thumb" size={16} />{compact(1240)}<i /><span className="sim-flip"><Icon name="thumb" size={16} /></span></span>
              <span><Icon name="share" size={16} />{t('sim.fb.share')}</span>
              <span><Icon name="download" size={16} />{t('sim.yt.download')}</span>
              <span><Icon name="bookmark" size={16} />{t('sim.yt.save')}</span>
            </div>
            <div className="sim-yt-desc">
              <b>{t('sim.yt.meta', { value: compact(12840) })}</b>
              <Caption text={post.caption} fold={fold} more={t('sim.more')} empty={t('sim.descEmpty')} />
            </div>
            <p className="sim-strong">{t('sim.yt.comments', { value: 128 })}</p>
          </div>
        </div>
        <aside className="sim-yt-side">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="sim-yt-card"><span className="sim-yt-thumb" /><span className="sim-yt-lines"><i /><i /></span></div>)}
        </aside>
      </div>
    </div>
  )
}

export default function Preview({ platform, format, device, post, dark }) {
  const layout = layoutOf(platform, format)
  const vertical = layout === 'vertical' || layout === 'story'
  const fold = rulesFor(platform, format).fold
  return (
    <Device device={device} platform={platform} theme={vertical || dark ? 'dark' : 'light'} vertical={vertical}>
      {layout === 'vertical' && <Vertical post={post} variant={VARIANT[platform]} fold={fold} />}
      {layout === 'story' && <Story post={post} />}
      {layout === 'watch' && <Watch post={post} fold={fold} />}
      {layout === 'feed' && platform === 'instagram' && <Instagram post={post} fold={fold} />}
      {layout === 'feed' && platform === 'facebook' && <Facebook post={post} fold={fold} />}
      {layout === 'feed' && platform === 'threads' && <Threads post={post} fold={fold} />}
    </Device>
  )
}
