---
title: Home
order: 0
---

Welcome to the site of the Anarchist Engineer.  Here you will find projects, write-ups, and "Blog" posts that I work on, just because.  This could be anything from software development to hardware hacks.  I'd love to say that I will publish something every (x) days (that's not true, I'd hate to say that), but I'm not making any commitments.

This site is built using a custom static site generator and hosted on Github pages on the anarchistengineer corp.  The actual code will be created and placed on Github under [anarchistengineering](https://github.com/anarchistengineering).

The idea for and the identification of the Anarchist Engineer was a realization after watching:

<iframe src="https://www.youtube.com/embed/uk-CF7klLdA" frameborder="0" allowfullscreen></iframe>

Latest Post's:

{{#slice posts offset="0" limit="5"}}

  [{{title}}]({{link}}) - {{formatDate published}}
  {{#if description}}

 * {{description}}
  {{/if}}
{{/slice}}
