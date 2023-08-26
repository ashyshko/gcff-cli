# Use React-Router-Dom with GCFF React client

## Initial setup

- Initialize react app via `create-react-app`
- Install React-Router-Dom via `npm install react-router-dom`
- Add deploy script via `gcff client init react`

## Using React Router

Consider you have something like

```
<BrowserRouter>
    <Routes>
        <Route path="/" element={<App/>}/>
        <Route path="/page1" element={<Page1/>}/>
        ...
    </Routes>
</BrowserRouter>
```

This routing works locally via `npm start` but doesn't work with cloud function.

To make it work, you need to change the first line to `<BrowserRouter basename={process.env.PUBLIC_URL}>`. This will not break the local development process but will add support for routing inside the cloud function.