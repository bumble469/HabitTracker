/** Decorative, scalable artwork shared by the welcome and dashboard surfaces. */
export default function BotanicalArt({ className = '' }) {
  return (
    <svg
      className={`botanical-art ${className}`}
      viewBox="0 0 400 440"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="212" cy="212" r="156" stroke="currentColor" strokeOpacity=".13" />
      <circle cx="212" cy="212" r="115" stroke="currentColor" strokeOpacity=".09" />
      <path d="M202 408C207 317 190 251 221 178C240 133 273 94 304 56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M213 290C176 260 143 224 130 176M214 235C253 223 291 197 315 165M239 147C218 126 204 95 202 65M201 349C243 325 280 294 298 261" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M219 184C218 142 230 108 263 98C270 132 254 165 219 184Z" fill="currentColor" fillOpacity=".24" stroke="currentColor" strokeOpacity=".45" />
      <path d="M253 127C268 90 289 60 320 49C327 84 301 116 253 127Z" fill="currentColor" fillOpacity=".52" />
      <path d="M210 260C178 258 145 241 133 205C167 197 200 220 210 260Z" fill="currentColor" fillOpacity=".44" />
      <path d="M145 209C115 194 100 164 105 134C137 141 152 171 145 209Z" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeOpacity=".5" />
      <path d="M225 230C242 195 271 178 301 187C293 218 267 233 225 230Z" fill="currentColor" fillOpacity=".52" />
      <path d="M284 193C289 161 309 140 337 134C339 163 319 186 284 193Z" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeOpacity=".5" />
      <path d="M234 141C206 133 188 112 186 87C216 87 235 109 234 141Z" fill="currentColor" fillOpacity=".4" />
      <path d="M206 346C224 310 249 292 279 300C272 329 246 346 206 346Z" fill="currentColor" fillOpacity=".25" stroke="currentColor" strokeOpacity=".5" />
      <path d="M271 304C270 279 284 253 308 241C320 268 303 295 271 304Z" fill="currentColor" fillOpacity=".48" />
      <path d="M203 371C179 345 166 318 171 292C198 305 209 335 203 371Z" fill="currentColor" fillOpacity=".38" />
      <path d="M72 270L77 258L82 270L94 275L82 280L77 292L72 280L60 275Z" fill="currentColor" fillOpacity=".55" />
      <path d="M330 315L333 307L336 315L344 318L336 321L333 329L330 321L322 318Z" fill="currentColor" fillOpacity=".45" />
      <circle cx="110" cy="88" r="3" fill="currentColor" fillOpacity=".5" />
      <circle cx="347" cy="224" r="3" fill="currentColor" fillOpacity=".4" />
    </svg>
  );
}
