---
title: Code
order: 2
---
Here are all of the repositories associated with https://github.com/anarchistengineering

**NOTE:** This listing requires a browser that supports ES6.  If your's doesn't, then upgrade.

<dl id="repos"></dl>

<script type="text/javascript">
  const alphaSort = (a, b)=>{
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    if(aLower < bLower){
      return -1;
    }
    if(aLower > bLower){
      return 1;
    }
    return 0;
  };
  Loader.get('https://api.github.com/users/anarchistengineering/repos', (err, repos)=>{
      const outputTo = document.querySelector('#repos');
      repos.sort(alphaSort).forEach((repo)=>{
          const dt = document.createElement('dt');
          dt.innerHTML = `<a href="${repo.html_url}"><strong>${repo.name}</strong> - ${repo.html_url}</a>`;
          outputTo.appendChild(dt);
          if(repo.description){
            const dd = document.createElement('dd');
            dd.innerHTML = repo.description;
            outputTo.appendChild(dd);
          }
        });
    });
</script>
